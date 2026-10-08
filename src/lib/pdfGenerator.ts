import {
  EcoUser,
  FootprintRecord,
  ForecastResponse,
  GoalItem,
  ScenarioItem,
  RecommendationItem,
  DigitalTwinState,
} from '../types';

function escapePdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, (ch) => {
      if (ch === '₂') return '2';
      if (ch === '—' || ch === '–') return '-';
      if (ch === '°') return ' deg ';
      return '';
    })
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function generateSustainabilityPdfBuffer(params: {
  reportType: 'Sustainability Report' | 'Digital Twin Report' | 'Monthly Report';
  user: EcoUser;
  latestRecord: FootprintRecord | null;
  forecast: ForecastResponse;
  twin: DigitalTwinState;
  recommendations: RecommendationItem[];
  goals: GoalItem[];
  scenarios: ScenarioItem[];
}): Buffer {
  const { reportType, user, latestRecord, forecast, twin, recommendations, goals, scenarios } = params;
  const generatedDate = new Date().toISOString().slice(0, 10);

  const lines: Array<{ text: string; size?: number; bold?: boolean; color?: [number, number, number]; indent?: number }> = [];

  lines.push({ text: `ECO TWIN ML - ${reportType.toUpperCase()}`, size: 16, bold: true, color: [0.06, 0.42, 0.24] });
  lines.push({ text: `AI-Powered Environmental Digital Twin Assessment | Generated: ${generatedDate}`, size: 9, color: [0.35, 0.42, 0.48] });
  lines.push({ text: `Account Holder: ${user.name} (${user.email}) | City: ${user.city || 'Not specified'} | Household: ${user.household_size || 1}`, size: 9, color: [0.2, 0.25, 0.3] });
  lines.push({ text: '----------------------------------------------------------------------------------------------------', size: 9, color: [0.75, 0.8, 0.78] });

  if (!latestRecord) {
    lines.push({ text: 'NO ENVIRONMENTAL FOOTPRINT RECORD AVAILABLE', size: 12, bold: true, color: [0.7, 0.2, 0.2] });
    lines.push({ text: 'Please complete your lifestyle assessment in the Carbon Calculator to populate this report.', size: 10 });
  } else {
    lines.push({ text: '1. EXECUTIVE CARBON FOOTPRINT & ECO SCORE SUMMARY', size: 12, bold: true, color: [0.06, 0.35, 0.2] });
    lines.push({
      text: `Monthly Carbon Footprint: ${latestRecord.predicted_footprint_kg} kg CO2e/month   |   Eco Score: ${latestRecord.eco_score}/100   |   Risk Tier: ${latestRecord.risk_category}`,
      size: 10,
      bold: true,
    });
    lines.push({
      text: `Primary Emission Driver: ${latestRecord.top_contributor}   |   Period Change: ${
        latestRecord.change_from_previous_pct !== null
          ? `${latestRecord.change_from_previous_pct > 0 ? '+' : ''}${latestRecord.change_from_previous_pct}%`
          : 'Baseline Assessment'
      }`,
      size: 9,
    });
    lines.push({
      text: `ML Pipeline: ${latestRecord.model_info.regression_model} (R2=${latestRecord.model_info.regression_metrics.r2}, MAE=${latestRecord.model_info.regression_metrics.mae} kg)`,
      size: 8,
      color: [0.35, 0.4, 0.45],
    });
    lines.push({ text: ' ', size: 6 });

    lines.push({ text: '2. CATEGORY EMISSION BREAKDOWN (kg CO2e / month)', size: 12, bold: true, color: [0.06, 0.35, 0.2] });
    const bd = latestRecord.emission_breakdown;
    const total = Math.max(1, latestRecord.predicted_footprint_kg);
    (Object.keys(bd) as Array<keyof typeof bd>).forEach((cat) => {
      const val = bd[cat];
      const pct = Math.round((val / total) * 1000) / 10;
      lines.push({
        text: `- ${cat.padEnd(16, ' ')}: ${String(val).padStart(6, ' ')} kg CO2e/mo  (${pct}% of total)`,
        size: 9,
        indent: 10,
      });
    });
    lines.push({ text: ' ', size: 6 });

    lines.push({ text: '3. EXPLAINABLE AI (XAI) - TOP LIFESTYLE DRIVERS', size: 12, bold: true, color: [0.06, 0.35, 0.2] });
    latestRecord.feature_importances.slice(0, 5).forEach((fi, idx) => {
      lines.push({
        text: `${idx + 1}. ${fi.label} [Weight: ${fi.importance_pct}%] - ${fi.explanation}`,
        size: 8.5,
        indent: 8,
      });
    });
    lines.push({ text: ' ', size: 6 });

    lines.push({ text: '4. DIGITAL TWIN STATUS & BIOSPHERE SYNTHESIS', size: 12, bold: true, color: [0.06, 0.35, 0.2] });
    lines.push({
      text: `Twin Status: ${twin.twin_status}   |   Twin Age: ${twin.twin_age_days} days   |   Canopy Offset Eq: ${twin.visual_state.tree_count} trees`,
      size: 9.5,
      bold: true,
    });
    lines.push({ text: `Summary: ${twin.twin_summary}`, size: 9 });
    lines.push({ text: ' ', size: 6 });

    lines.push({ text: '5. TIME-SERIES CARBON FORECAST (6-MONTH PROJECTION)', size: 12, bold: true, color: [0.06, 0.35, 0.2] });
    lines.push({
      text: `Trend Direction: ${forecast.trend}   |   6-Month Projected Footprint: ${forecast.predicted_final_kg ?? 'N/A'} kg CO2e/mo (${
        forecast.percentage_change !== null ? `${forecast.percentage_change > 0 ? '+' : ''}${forecast.percentage_change}%` : 'N/A'
      })`,
      size: 9.5,
    });
    lines.push({ text: `Interpretation: ${forecast.interpretation}`, size: 8.5 });
    if (forecast.limited_history_notice) {
      lines.push({ text: `Notice: ${forecast.limited_history_notice}`, size: 8, color: [0.55, 0.38, 0.08] });
    }
    lines.push({ text: ' ', size: 6 });

    lines.push({ text: '6. PERSONALIZED AI MITIGATION RECOMMENDATIONS', size: 12, bold: true, color: [0.06, 0.35, 0.2] });
    recommendations.slice(0, 5).forEach((rec, i) => {
      lines.push({
        text: `${i + 1}. [${rec.priority.toUpperCase()} PRIORITY | -${rec.estimated_reduction_kg} kg CO2e/mo] ${rec.title} (${rec.category})`,
        size: 9,
        bold: true,
        indent: 6,
      });
      lines.push({ text: `   Reason: ${rec.reason}`, size: 8, indent: 12, color: [0.3, 0.35, 0.4] });
    });
    lines.push({ text: ' ', size: 6 });

    lines.push({ text: '7. ACTIVE GOALS & SAVED SCENARIOS', size: 12, bold: true, color: [0.06, 0.35, 0.2] });
    if (goals.length === 0) {
      lines.push({ text: '- Goals: No environmental reduction goals configured yet.', size: 9, indent: 8 });
    } else {
      goals.slice(0, 3).forEach((g) => {
        lines.push({
          text: `- Goal: ${g.title} | Target: ${g.target_footprint_kg} kg CO2e/mo | Progress: ${g.progress_pct}% (${g.status})`,
          size: 8.5,
          indent: 8,
        });
      });
    }
    if (scenarios.length === 0) {
      lines.push({ text: '- Scenarios: No custom scenarios saved in Scenario Lab yet.', size: 9, indent: 8 });
    } else {
      scenarios.slice(0, 3).forEach((s) => {
        lines.push({
          text: `- Scenario: ${s.name} | Predicted: ${s.predicted_footprint_kg} kg CO2e/mo (${s.reduction_vs_current_pct}% reduction, Score: ${s.eco_score})`,
          size: 8.5,
          indent: 8,
        });
      });
    }
  }

  lines.push({ text: ' ', size: 8 });
  lines.push({ text: '----------------------------------------------------------------------------------------------------', size: 8, color: [0.75, 0.8, 0.78] });
  lines.push({
    text: 'Dataset Notice: Model trained on synthetic demonstration/training dataset - not real-world survey data.',
    size: 7.5,
    color: [0.45, 0.5, 0.55],
  });

  // Construct valid single-page PDF stream
  const ops: string[] = [];
  let y = 795;
  for (const line of lines) {
    if (y < 42) break;
    const fontSize = line.size || 10;
    const fontKey = line.bold ? '/F2' : '/F1';
    const [r, g, b] = line.color || [0.08, 0.14, 0.2];
    const x = 42 + (line.indent || 0);
    const maxChars = Math.floor((525 - (line.indent || 0)) / (fontSize * 0.5));
    const rawText = line.text || ' ';
    const wrapped: string[] = [];
    if (rawText.length <= maxChars) {
      wrapped.push(rawText);
    } else {
      const words = rawText.split(' ');
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxChars) {
          wrapped.push(cur.trim());
          cur = w;
        } else {
          cur = (cur + ' ' + w).trim();
        }
      }
      if (cur.trim()) wrapped.push(cur.trim());
    }

    for (const seg of wrapped) {
      if (y < 42) break;
      ops.push(`BT ${fontKey} ${fontSize} Tf ${r} ${g} ${b} rg ${x} ${y} Td (${escapePdfText(seg)}) Tj ET`);
      y -= fontSize + 4.5;
    }
  }

  const contentStream = ops.join('\n');
  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /MediaBox [0 0 612 842] /Contents 6 0 R >>\nendobj\n'
  );
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  objects.push(
    `6 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
