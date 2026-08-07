const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const { runCustomRules, luhnCheck } = require('../src/scanner/customRules');
const { runSemgrep } = require('../src/scanner/semgrepRunner');
const { runGitleaks } = require('../src/scanner/gitleaksRunner');
const { extractRepoMetadata } = require('../src/scanner/extractor');
const { deduplicateAndCapFindings } = require('../src/scanner/deduplicator');
const { luhnCheck: luhnAlgo } = require('../src/scanner/customRules');

// Test suite assertion helper
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ TEST PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('================================================');
  console.log('RUNNING AVSS SAST SCANNER ENGINE VERIFICATION SUITE');
  console.log('================================================\n');

  // Test 1: Unit Test for Luhn Checksum Algorithm
  console.log('--- Step 1: Testing Luhn Checksum Algorithm ---');
  // 4532015112830366 is valid Visa card number matching Luhn
  assert(luhnAlgo('4532015112830366') === true, 'Valid Visa card 4532015112830366 passes Luhn checksum');
  // 1234567812345678 fails Luhn
  assert(luhnAlgo('1234567812345678') === false, 'Invalid card number 1234567812345678 fails Luhn checksum');
  assert(luhnAlgo('9999888877776666') === false, 'Random 16-digit ID fails Luhn checksum');

  // Create temporary mock test repositories on disk
  const testDir = path.join(os.tmpdir(), `avss-test-repo-${uuidv4().substring(0, 8)}`);
  fs.mkdirSync(testDir, { recursive: true });

  try {
    // 1. Healthcare mock file (MedRecord Lite)
    fs.mkdirSync(path.join(testDir, 'src', 'controllers'), { recursive: true });

    // File with PHI in sink WITHOUT encrypt (SHOULD be flagged)
    fs.writeFileSync(
      path.join(testDir, 'src', 'controllers', 'patientController.js'),
      `
const express = require('express');
const app = express();

app.get('/api/patients/:id', (req, res) => {
  const patient_id = req.params.id;
  const diagnosis = "Acute Respiratory Infection";
  const ssn = "999-00-1234";

  // SINK: Unencrypted log leak
  console.log("Accessing record for patient:", patient_id, diagnosis, ssn);

  res.json({ status: "ok" });
});
      `
    );

    // File with PHI variable defined but encrypted / NOT logged (SHOULD NOT be flagged)
    fs.writeFileSync(
      path.join(testDir, 'src', 'controllers', 'securePatient.js'),
      `
function processPatient(patient_id, diagnosis) {
  // Variable declared and encrypted properly
  const encryptedId = crypto.encrypt(patient_id);
  const encryptedDiag = crypto.encrypt(diagnosis);
  return { encryptedId, encryptedDiag };
}
      `
    );

    // 2. Fintech mock file (PayLite)
    fs.writeFileSync(
      path.join(testDir, 'src', 'controllers', 'paymentController.js'),
      `
const api_key = "AKIA1234567890123456"; // Hardcoded secret
const cvv = "123"; // Raw CVV literal assignment

function processCard() {
  const card_number = "4532015112830366"; // Valid Luhn card number
  console.log("Processing card");
}

app.post('/api/checkout', (req, res) => {
  // Payment handler missing amount > 0 check
  const amount = req.body.amount;
  chargeCard(amount);
});
      `
    );

    // 3. E-commerce mock file (Frontend client path)
    fs.mkdirSync(path.join(testDir, 'client', 'src', 'components'), { recursive: true });
    fs.writeFileSync(
      path.join(testDir, 'client', 'src', 'components', 'CheckoutCart.jsx'),
      `
export function Cart() {
  const calculateTotal = (price, items) => {
    // Client side price calculation
    total_price = price * items.length;
    discount = 50;
    return total_price - discount;
  };
}
      `
    );

    // 4. README file for sector detection sampling
    fs.writeFileSync(
      path.join(testDir, 'README.md'),
      `
# MedRecord & PayLite Combined Healthcare Fintech App
This application manages patient medical records, diagnosis codes, and processes credit card payment transactions under PCI-DSS standards.
      `
    );

    console.log('\n--- Step 2: Testing Rule Engine against Test Repository ---');
    const customFindings = await runCustomRules(testDir);
    console.log(`Custom rule engine generated ${customFindings.length} findings.`);

    // Verify Healthcare PHI rule
    const phiFindings = customFindings.filter(f => f.type === 'phi-log-leak');
    assert(phiFindings.length >= 1, 'Healthcare PHI-in-sink rule triggered correctly for patientController.js');
    assert(phiFindings.every(f => f.filePath.includes('patientController.js')), 'PHI rule correctly ignored securePatient.js where no sink was called without encryption');

    // Verify Fintech Luhn Card Rule
    const cardFindings = customFindings.filter(f => f.type === 'card-number-exposure');
    assert(cardFindings.length >= 1, 'Fintech Luhn Checksum card rule triggered for valid card 4532015112830366');
    assert(cardFindings[0].evidence.includes('Luhn checksum validation PASSED'), 'Card evidence contains explicit Luhn validation confirmation');

    // Verify Fintech Raw CVV Rule
    const cvvFindings = customFindings.filter(f => f.type === 'raw-cvv-pin-exposure');
    assert(cvvFindings.length >= 1, 'Fintech raw CVV literal assignment rule triggered');

    // Verify E-commerce Price Manipulation
    const priceFindings = customFindings.filter(f => f.type === 'price-manipulation');
    assert(priceFindings.length >= 1, 'E-commerce price manipulation rule triggered for client total_price assignment and backend payment route');

    // Verify Route & Text Extractor
    console.log('\n--- Step 3: Testing Route Extractor & Text Sampler ---');
    const meta = extractRepoMetadata(testDir);
    assert(meta.detectedRoutes.includes('/api/patients/:id'), 'Extracted route /api/patients/:id');
    assert(meta.detectedRoutes.includes('/api/checkout'), 'Extracted route /api/checkout');
    assert(meta.repoTextSample.includes('MedRecord & PayLite'), 'Extracted README content into repoTextSample');

    // Requirement #6: 5x Repeatability Test
    console.log('\n--- Step 4: Testing 5x Repeatability (Determinism Check) ---');
    let prevOutputString = null;
    for (let i = 1; i <= 5; i++) {
      const semgrepF = await runSemgrep(testDir);
      const gitleaksF = await runGitleaks(testDir);
      const customF = await runCustomRules(testDir);
      const all = deduplicateAndCapFindings([...semgrepF, ...gitleaksF, ...customF]);

      const currentOutputString = JSON.stringify(all);
      if (prevOutputString !== null) {
        assert(currentOutputString === prevOutputString, `Run #${i} produced IDENTICAL output to run #${i - 1}`);
      } else {
        console.log(`Run #${i} baseline output generated (${all.length} findings).`);
      }
      prevOutputString = currentOutputString;
    }

    console.log('\n================================================');
    console.log('🎉 ALL SCANNER ENGINE VERIFICATION TESTS PASSED!');
    console.log('================================================');

  } finally {
    // Clean up test folder
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
