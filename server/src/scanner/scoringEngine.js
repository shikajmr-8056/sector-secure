/**
 * AVSS Scoring Engine & Sector Detector (Person 2 Implementation)
 */

const SECTOR_PATTERNS = {
  healthcare: {
    routes: [/patient/i, /diagnosis/i, /medical-records/i, /ehr/i],
    fields: [/patient_id/i, /diagnosis/i, /ssn/i, /blood_type/i, /medical/i],
    keywords: [/patient/i, /hospital/i, /hipaa/i, /medical record/i, /dpdp/i],
  },
  fintech: {
    routes: [/transaction/i, /account/i, /payment/i, /kyc/i, /ledger/i, /charge/i],
    fields: [/account_number/i, /card_number/i, /cvv/i, /ifsc_code/i, /cardNumber/i, /ledgerEntryId/i],
    keywords: [/payment/i, /bank/i, /rbi/i, /pci-dss/i, /stripe/i, /settlement/i, /kyc/i],
  },
  ecommerce: {
    routes: [/cart/i, /checkout/i, /coupon/i, /discount/i, /order/i],
    fields: [/total_price/i, /discount_code/i, /cart_id/i, /price/i],
    keywords: [/checkout/i, /cart/i, /store/i, /shopping/i, /order/i],
  },
};

const SECTOR_MULTIPLIERS = {
  healthcare: 1.6,
  fintech: 1.5,
  ecommerce: 1.3,
  general: 1.0,
};

/**
 * Detect sector based on detected routes, findings, and repo text sample
 */
function detectSector(detectedRoutes = [], repoTextSample = "", findings = []) {
  const rawScores = { healthcare: 0, fintech: 0, ecommerce: 0, general: 0 };
  const evidenceMap = [];

  const textSample = `${repoTextSample} ${findings.map((f) => `${f.title} ${f.filePath} ${f.evidence || ""}`).join(" ")}`;

  Object.entries(SECTOR_PATTERNS).forEach(([sector, patterns]) => {
    // Tier 1: Routes (3x)
    detectedRoutes.forEach((route) => {
      patterns.routes.forEach((regex) => {
        if (regex.test(route)) {
          rawScores[sector] += 3;
          evidenceMap.push(`route: ${route}`);
        }
      });
    });

    // Tier 2: Field / Variable names (2x)
    patterns.fields.forEach((regex) => {
      const matches = textSample.match(new RegExp(regex.source, "gi"));
      if (matches) {
        const points = Math.min(matches.length, 5) * 2;
        rawScores[sector] += points;
        evidenceMap.push(`field: ${matches[0]} ×${matches.length}`);
      }
    });

    // Tier 3: Free-text keywords (1x)
    patterns.keywords.forEach((regex) => {
      const matches = textSample.match(new RegExp(regex.source, "gi"));
      if (matches) {
        const points = Math.min(matches.length, 5);
        rawScores[sector] += points;
        evidenceMap.push(`keyword: ${matches[0]} ×${matches.length}`);
      }
    });
  });

  // Calculate normalized confidence & pick top sector
  let topSector = "general";
  let maxScore = 0;
  let totalScore = Object.values(rawScores).reduce((a, b) => a + b, 0);

  Object.entries(rawScores).forEach(([sec, score]) => {
    if (score > maxScore) {
      maxScore = score;
      topSector = sec;
    }
  });

  if (maxScore < 5) {
    topSector = "general";
  }

  // Generate confidence breakdown
  const confidence = {
    fintech: totalScore ? Math.round((rawScores.fintech / totalScore) * 100) / 100 : 0.25,
    healthcare: totalScore ? Math.round((rawScores.healthcare / totalScore) * 100) / 100 : 0.25,
    ecommerce: totalScore ? Math.round((rawScores.ecommerce / totalScore) * 100) / 100 : 0.25,
    general: totalScore ? Math.round((rawScores.general / totalScore) * 100) / 100 : 0.25,
  };

  // Ensure top sector has highest confidence relative to general
  if (topSector !== "general" && confidence[topSector] === 0) {
    confidence[topSector] = 0.85;
  }

  return {
    suggestedSector: topSector,
    scores: confidence,
    matchedEvidence: [...new Set(evidenceMap)].slice(0, 6),
  };
}

/**
 * Apply AVSS Formula & Regulatory Citations to Findings
 */
function scoreFindings(findings = [], sector = "general") {
  const secMultiplier = SECTOR_MULTIPLIERS[sector] || 1.0;

  return findings.map((f) => {
    const baseSev = f.baseSeverity ?? f.baseline ?? 5.0;
    const epss = f.epssScore ?? f.epss ?? 0.1;
    const type = (f.type || f.title || "").toLowerCase();

    let regWeight = 1.0;
    let regTag = "Standard security best practice violation.";

    if (sector === "healthcare" && (type.includes("phi") || type.includes("log") || type.includes("patient"))) {
      regWeight = 1.8;
      regTag = "Unencrypted PHI in logs — relevant under India's DPDP Act provisions on sensitive personal data";
    } else if (sector === "fintech" && (type.includes("card") || type.includes("secret") || type.includes("gitleaks"))) {
      regWeight = 1.8;
      regTag = "Exposed cardholder data — violates PCI-DSS 3.4 storage requirements";
    } else if (sector === "fintech" && type.includes("secret")) {
      regWeight = 1.7;
      regTag = "Falls under RBI's 2026 Cybersecurity Master Directions";
    } else if (sector === "ecommerce" && (type.includes("price") || type.includes("discount"))) {
      regWeight = 1.5;
      regTag = "Client-side-only price validation — direct financial exploitation risk";
    } else if (type.includes("secret") || type.includes("gitleaks") || type.includes("credential")) {
      regWeight = 1.5;
      regTag = "CWE-798 — Hardcoded credential in tracked configuration";
    }

    const unscaledAvss = baseSev * (1 + epss) * secMultiplier * regWeight;
    const avssScore = Math.min(10, Math.round(unscaledAvss * 10) / 10);

    return {
      ...f,
      avssScore,
      baseline: baseSev,
      baseSeverity: baseSev,
      regulatoryTag: regTag,
      reason: `Sector multiplier (${secMultiplier}x) × Regulatory weight (${regWeight}x) applied`,
      citations: {
        fintech: "PCI-DSS 3.4 / RBI 2026 Cybersecurity Directions",
        healthcare: "India's DPDP Act / HIPAA §164.312",
        ecommerce: "CWE-89 / E-commerce Payment Integrity Standards",
        general: "CWE / EPSS Standard Vulnerability Baseline",
        [sector]: regTag,
      },
    };
  });
}

module.exports = {
  detectSector,
  scoreFindings,
};
