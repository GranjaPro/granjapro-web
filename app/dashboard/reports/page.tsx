"use client";

import { useState } from "react";
import {
  FileText,
  Egg,
  Skull,
  Wheat,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  ChevronDown,
  FileDown,
  Sheet,
  AlertTriangle,
  CheckCircle2,
  Info,
  Target,
  Activity,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
} from "recharts";

const periodos = ["7 dias", "30 dias", "90 dias", "12 meses"];

// --- Unified Data ---
const lucroTrend = [
  { periodo: "Out", receita: 38000, despesa: 35500, lucro: 2500 },
  { periodo: "Nov", receita: 40200, despesa: 36800, lucro: 3400 },
  { periodo: "Dez", receita: 42500, despesa: 38100, lucro: 4400 },
  { periodo: "Jan", receita: 39800, despesa: 37200, lucro: 2600 },
  { periodo: "Fev", receita: 41000, despesa: 37900, lucro: 3100 },
  { periodo: "Mar", receita: 43500, despesa: 41400, lucro: 2100 },
];

const producaoSemanal = [
  { dia: "Seg", ovos: 4250, meta: 4200 },
  { dia: "Ter", ovos: 4310, meta: 4200 },
  { dia: "Qua", ovos: 4180, meta: 4200 },
  { dia: "Qui", ovos: 4420, meta: 4200 },
  { dia: "Sex", ovos: 4380, meta: 4200 },
  { dia: "Sáb", ovos: 4290, meta: 4200 },
  { dia: "Dom", ovos: 4150, meta: 4200 },
];

const galpaoPerformance = [
  { galpao: "Vale Verde", ovos: 14200, postura: 89.2, mortes: 4, eficiencia: 92 },
  { galpao: "Central", ovos: 12800, postura: 87.1, mortes: 8, eficiencia: 85 },
  { galpao: "Nascente", ovos: 2980, postura: 84.5, mortes: 4, eficiencia: 78 },
];

const despesasBreakdown = [
  { categoria: "Ração", valor: 19200, pct: 46.4, color: "#22c55e" },
  { categoria: "Mão de obra", valor: 15900, pct: 38.4, color: "#3b82f6" },
  { categoria: "Energia", valor: 2800, pct: 6.8, color: "#eab308" },
  { categoria: "Medicamentos", valor: 1200, pct: 2.9, color: "#ef4444" },
  { categoria: "Manutenção", valor: 1500, pct: 3.6, color: "#a855f7" },
  { categoria: "Outros", valor: 800, pct: 1.9, color: "#6b7280" },
];

const mortalidadeCausas = [
  { causa: "Estresse térmico", qtd: 19, pct: 40.4 },
  { causa: "Respiratório", qtd: 14, pct: 29.8 },
  { causa: "Não identificado", qtd: 8, pct: 17.0 },
  { causa: "Predadores", qtd: 4, pct: 8.5 },
  { causa: "Outros", qtd: 2, pct: 4.3 },
];

const racaoSemanal = [
  { dia: "Seg", consumo: 1850, custo: 2775 },
  { dia: "Ter", consumo: 1820, custo: 2730 },
  { dia: "Qua", consumo: 1900, custo: 2850 },
  { dia: "Qui", consumo: 1780, custo: 2670 },
  { dia: "Sex", consumo: 1830, custo: 2745 },
  { dia: "Sáb", consumo: 1810, custo: 2715 },
  { dia: "Dom", consumo: 1760, custo: 2640 },
];

// --- Insights engine ---
type InsightLevel = "critical" | "warning" | "success";
interface Insight {
  level: InsightLevel;
  title: string;
  description: string;
  action: string;
  metric?: string;
}

const insights: Insight[] = [
  {
    level: "critical",
    title: "Margem de lucro em queda",
    description: "Lucro caiu 32% em relação ao mês anterior. Despesas com ração subiram 4,8%.",
    action: "Renegociar ração ou ajustar preço de venda",
    metric: "4,8%",
  },
  {
    level: "warning",
    title: "Galpão Nascente abaixo da meta",
    description: "Taxa de postura 84,5% (meta: 87%). Eficiência geral do galpão em 78%.",
    action: "Verificar condições ambientais e idade do lote",
    metric: "84,5%",
  },
  {
    level: "warning",
    title: "Estresse térmico é a principal causa de mortes",
    description: "40% das mortes por estresse térmico. 8 mortes no Galpão Central.",
    action: "Revisar ventilação e nebulização nos galpões",
    metric: "40%",
  },
  {
    level: "success",
    title: "Receita crescendo consistentemente",
    description: "Receita cresceu 6,1% no último mês com tendência de alta nos últimos 3 meses.",
    action: "Manter volume de vendas e explorar novos canais",
    metric: "+6,1%",
  },
];

const insightConfig = {
  critical: { bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle, iconColor: "text-red-500", titleColor: "text-red-800", descColor: "text-red-600", actionBg: "bg-red-100", actionText: "text-red-700", metricBg: "bg-red-100", metricText: "text-red-700" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", icon: Info, iconColor: "text-amber-500", titleColor: "text-amber-800", descColor: "text-amber-600", actionBg: "bg-amber-100", actionText: "text-amber-700", metricBg: "bg-amber-100", metricText: "text-amber-700" },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: CheckCircle2, iconColor: "text-emerald-500", titleColor: "text-emerald-800", descColor: "text-emerald-600", actionBg: "bg-emerald-100", actionText: "text-emerald-700", metricBg: "bg-emerald-100", metricText: "text-emerald-700" },
};

// --- Export data ---
const allReports = {
  producao: {
    title: "Produção",
    headers: ["Dia", "Ovos Produzidos", "Meta"],
    rows: producaoSemanal.map((d) => [d.dia, d.ovos, d.meta]),
    summary: [
      ["Total da semana", "29.980 ovos"],
      ["Média diária", "4.283 ovos"],
      ["Taxa média de postura", "88,3%"],
      ["Quebras totais", "229 (0,76%)"],
    ],
    extraTitle: "Produção por Galpão",
    extraHeaders: ["Galpão", "Ovos (semana)", "Postura (%)", "Mortes", "Eficiência (%)"],
    extraRows: galpaoPerformance.map((g) => [g.galpao, g.ovos, g.postura, g.mortes, g.eficiencia]),
  },
  mortalidade: {
    title: "Mortalidade",
    headers: ["Causa", "Quantidade", "Percentual (%)"],
    rows: mortalidadeCausas.map((c) => [c.causa, c.qtd, c.pct]),
    summary: [
      ["Óbitos na semana", "16"],
      ["Taxa de mortalidade", "0,15%"],
      ["Média diária", "2,3"],
      ["Aves ativas", "10.650"],
    ],
    extraTitle: "Mortes por Galpão",
    extraHeaders: ["Galpão", "Mortes"],
    extraRows: galpaoPerformance.map((g) => [g.galpao, g.mortes]),
  },
  racao: {
    title: "Ração",
    headers: ["Dia", "Consumo (kg)", "Custo (R$)"],
    rows: racaoSemanal.map((d) => [d.dia, d.consumo, d.custo]),
    summary: [
      ["Consumo semanal", "12.750 kg"],
      ["Custo semanal", "R$ 19.125"],
      ["Custo por ave/dia", "R$ 0,059"],
      ["Consumo por ave/dia", "118g"],
    ],
    extraTitle: "Distribuição por Tipo",
    extraHeaders: ["Tipo", "Quantidade (kg)"],
    extraRows: [["Postura", 8500], ["Crescimento", 2800], ["Mineral", 1450]],
  },
  financeiro: {
    title: "Financeiro",
    headers: ["Mês", "Receita (R$)", "Despesas (R$)", "Lucro (R$)"],
    rows: lucroTrend.map((d) => [d.periodo, d.receita, d.despesa, d.lucro]),
    summary: [
      ["Receita mensal", "R$ 43.500"],
      ["Despesas", "R$ 41.400"],
      ["Lucro", "R$ 2.100"],
      ["Margem", "4,8%"],
    ],
    extraTitle: "Despesas por Categoria",
    extraHeaders: ["Categoria", "Valor (R$)", "Percentual (%)"],
    extraRows: despesasBreakdown.map((d) => [d.categoria, d.valor, d.pct]),
  },
};

const customTooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

// --- Health Score ---
function computeHealthScore() {
  const margem = 4.8;
  const postura = 88.3;
  const mortalidade = 0.15;
  const eficienciaRacao = 92;

  let score = 0;
  score += margem >= 10 ? 30 : margem >= 5 ? 20 : margem >= 0 ? 10 : 0;
  score += postura >= 90 ? 30 : postura >= 85 ? 22 : postura >= 80 ? 15 : 5;
  score += mortalidade <= 0.1 ? 20 : mortalidade <= 0.2 ? 15 : mortalidade <= 0.5 ? 8 : 0;
  score += eficienciaRacao >= 90 ? 20 : eficienciaRacao >= 80 ? 14 : eficienciaRacao >= 70 ? 8 : 0;
  return score;
}

function getScoreColor(score: number) {
  if (score >= 80) return { ring: "text-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Excelente" };
  if (score >= 60) return { ring: "text-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Atenção" };
  return { ring: "text-red-500", bg: "bg-red-50", text: "text-red-700", label: "Crítico" };
}

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState("7 dias");
  const [showPeriodo, setShowPeriodo] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const healthScore = computeHealthScore();
  const scoreStyle = getScoreColor(healthScore);

  function addPDFSection(doc: jsPDF, report: typeof allReports.producao, startY: number): number {
    let y = startY;
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(report.title, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text("Resumo", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: report.summary,
      theme: "grid",
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Dados Detalhados", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [report.headers],
      body: report.rows.map((r) => r.map(String)),
      theme: "striped",
      headStyles: { fillColor: [45, 122, 79], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(report.extraTitle, 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [report.extraHeaders],
      body: report.extraRows.map((r: any[]) => r.map(String)),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
    return y;
  }

  // --- PDF Chart Helpers ---
  function drawBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: { label: string; value: number; color: number[] }[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 4);
    const maxVal = Math.max(...data.map((d) => d.value));
    const barW = Math.min((w - (data.length - 1) * 3) / data.length, 22);
    const totalBarsW = data.length * barW + (data.length - 1) * 3;
    const startX = x + (w - totalBarsW) / 2;

    // Background grid lines
    doc.setDrawColor(230, 230, 230);
    for (let i = 0; i <= 4; i++) {
      const lineY = y + h - (h * i) / 4;
      doc.line(x, lineY, x + w, lineY);
    }

    data.forEach((d, i) => {
      const barH = (d.value / maxVal) * (h - 10);
      const bx = startX + i * (barW + 3);
      const by = y + h - barH;
      doc.setFillColor(d.color[0], d.color[1], d.color[2]);
      doc.roundedRect(bx, by, barW, barH, 1.5, 1.5, "F");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(d.label, bx + barW / 2, y + h + 4, { align: "center" });
      doc.setFontSize(6);
      doc.setTextColor(30, 41, 59);
      doc.text(d.value.toLocaleString("pt-BR"), bx + barW / 2, by - 2, { align: "center" });
    });
  }

  function drawGroupedBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: { label: string; values: number[]; colors: number[][] }[], legend: { label: string; color: number[] }[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 8);
    // Legend
    legend.forEach((l, i) => {
      const lx = x + w - (legend.length - i) * 40;
      doc.setFillColor(l.color[0], l.color[1], l.color[2]);
      doc.roundedRect(lx, y - 12, 5, 3, 0.5, 0.5, "F");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(l.label, lx + 7, y - 9.5);
    });

    const maxVal = Math.max(...data.flatMap((d) => d.values));
    const groupW = (w - (data.length - 1) * 4) / data.length;
    const barW = Math.min((groupW - 2) / data[0].values.length, 12);

    doc.setDrawColor(230, 230, 230);
    for (let i = 0; i <= 4; i++) {
      const lineY = y + h - (h * i) / 4;
      doc.line(x, lineY, x + w, lineY);
    }

    data.forEach((d, i) => {
      const gx = x + i * (groupW + 4);
      d.values.forEach((v, j) => {
        const barH = (v / maxVal) * (h - 10);
        const bx = gx + j * (barW + 1);
        const by = y + h - barH;
        doc.setFillColor(d.colors[j][0], d.colors[j][1], d.colors[j][2]);
        doc.roundedRect(bx, by, barW, barH, 1, 1, "F");
      });
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(d.label, gx + (d.values.length * (barW + 1)) / 2, y + h + 4, { align: "center" });
    });
  }

  function drawHorizontalBarChart(doc: jsPDF, x: number, y: number, w: number, data: { label: string; value: number; pct: number; color: number[] }[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y);
    let cy = y + 6;
    const barMaxW = w - 80;
    data.forEach((d) => {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(d.label, x, cy + 3);
      const barX = x + 38;
      // Background
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(barX, cy, barMaxW, 5, 1, 1, "F");
      // Value bar
      doc.setFillColor(d.color[0], d.color[1], d.color[2]);
      doc.roundedRect(barX, cy, (d.pct / 100) * barMaxW, 5, 1, 1, "F");
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      doc.text(`R$ ${d.value.toLocaleString("pt-BR")} (${d.pct}%)`, barX + barMaxW + 3, cy + 3.5);
      cy += 9;
    });
    return cy;
  }

  function drawLineChart(doc: jsPDF, x: number, y: number, w: number, h: number, datasets: { data: number[]; color: number[]; label: string }[], labels: string[], title: string) {
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, x, y - 8);
    // Legend
    datasets.forEach((ds, i) => {
      const lx = x + w - (datasets.length - i) * 35;
      doc.setDrawColor(ds.color[0], ds.color[1], ds.color[2]);
      doc.setLineWidth(1.2);
      doc.line(lx, y - 10, lx + 8, y - 10);
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(ds.label, lx + 10, y - 8.5);
    });

    const allVals = datasets.flatMap((ds) => ds.data);
    const maxVal = Math.max(...allVals);
    const minVal = Math.min(...allVals) * 0.9;
    const range = maxVal - minVal;

    // Grid
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    for (let i = 0; i <= 4; i++) {
      const lineY = y + h - (h * i) / 4;
      doc.line(x, lineY, x + w, lineY);
      doc.setFontSize(6);
      doc.setTextColor(160, 170, 180);
      const val = minVal + (range * i) / 4;
      doc.text((val / 1000).toFixed(0) + "k", x - 2, lineY + 1.5, { align: "right" });
    }

    // X labels
    const stepX = w / (labels.length - 1);
    labels.forEach((l, i) => {
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(l, x + i * stepX, y + h + 5, { align: "center" });
    });

    // Lines
    datasets.forEach((ds) => {
      doc.setDrawColor(ds.color[0], ds.color[1], ds.color[2]);
      doc.setLineWidth(1);
      for (let i = 1; i < ds.data.length; i++) {
        const x1 = x + (i - 1) * stepX;
        const y1 = y + h - ((ds.data[i - 1] - minVal) / range) * h;
        const x2 = x + i * stepX;
        const y2 = y + h - ((ds.data[i] - minVal) / range) * h;
        doc.line(x1, y1, x2, y2);
      }
      // Dots
      ds.data.forEach((v, i) => {
        const cx = x + i * stepX;
        const cy = y + h - ((v - minVal) / range) * h;
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, 1.8, "F");
        doc.setFillColor(ds.color[0], ds.color[1], ds.color[2]);
        doc.circle(cx, cy, 1.2, "F");
      });
    });
  }

  function drawHealthGauge(doc: jsPDF, cx: number, cy: number, score: number) {
    const r = 14;
    // Background ring
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(3);
    doc.circle(cx, cy, r);
    // Score arc
    const color = score >= 80 ? [34, 197, 94] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(3);
    const endAngle = -90 + (score / 100) * 360;
    const steps = Math.round(score * 1.5);
    for (let i = 0; i < steps; i++) {
      const a1 = (-90 + (i / steps) * (endAngle + 90)) * (Math.PI / 180);
      const a2 = (-90 + ((i + 1) / steps) * (endAngle + 90)) * (Math.PI / 180);
      doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
    }
    doc.setFontSize(14);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(String(score), cx, cy + 2, { align: "center" });
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text("/ 100", cx, cy + 7, { align: "center" });
  }

  function exportPDF() {
    const doc = new jsPDF();
    const timestamp = `Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    doc.setFontSize(20);
    doc.setTextColor(30, 41, 59);
    doc.text("Granja Pro — Relatório Completo", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período: ${periodo}`, 14, 28);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(timestamp, 14, 34);

    // Health Gauge
    drawHealthGauge(doc, 175, 24, healthScore);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Saúde da Granja", 175, 44, { align: "center" });

    const checkPage = (need: number) => { if (y + need > 280) { doc.addPage(); y = 16; } };

    // KPIs Table
    let y = 48;
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor", "Variação", "Detalhe"]],
      body: [
        ["Lucro Mensal", "R$ 2.100", "-32,3%", "Margem: 4,8%"],
        ["Produção Semanal", "29.980 ovos", "+3,2%", "Postura: 88,3%"],
        ["Mortalidade", "0,15%", "-8,2%", "16 óbitos na semana"],
        ["Eficiência Ração", "R$ 0,64/ovo", "-3,1%", "Custo por ovo"],
      ],
      theme: "grid",
      headStyles: { fillColor: [45, 122, 79], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Insights Table
    checkPage(50);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Alertas e Ações Recomendadas", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Prioridade", "Alerta", "Ação Recomendada"]],
      body: insights.map((i) => [
        i.level === "critical" ? "URGENTE" : i.level === "warning" ? "ATENÇÃO" : "POSITIVO",
        i.title + " — " + i.description,
        i.action,
      ]),
      theme: "grid",
      headStyles: { fillColor: [45, 122, 79], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      margin: { left: 14 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 95 } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Profit Trend Chart
    checkPage(75);
    drawLineChart(doc, 20, y + 12, 170, 45,
      [
        { data: lucroTrend.map((d) => d.receita), color: [34, 197, 94], label: "Receita" },
        { data: lucroTrend.map((d) => d.despesa), color: [239, 68, 68], label: "Despesas" },
        { data: lucroTrend.map((d) => d.lucro), color: [99, 102, 241], label: "Lucro" },
      ],
      lucroTrend.map((d) => d.periodo),
      "Evolução do Lucro"
    );
    y += 65;
    autoTable(doc, {
      startY: y,
      head: [["Mês", "Receita (R$)", "Despesas (R$)", "Lucro (R$)", "Margem (%)"]],
      body: lucroTrend.map((d) => [
        d.periodo,
        "R$ " + d.receita.toLocaleString("pt-BR"),
        "R$ " + d.despesa.toLocaleString("pt-BR"),
        "R$ " + d.lucro.toLocaleString("pt-BR"),
        ((d.lucro / d.receita) * 100).toFixed(1) + "%",
      ]),
      theme: "striped",
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Expense Horizontal Bar Chart + Table
    checkPage(70);
    y = drawHorizontalBarChart(doc, 14, y, 182, despesasBreakdown.map((d) => ({
      label: d.categoria,
      value: d.valor,
      pct: d.pct,
      color: d.color === "#22c55e" ? [34, 197, 94] : d.color === "#3b82f6" ? [59, 130, 246] : d.color === "#eab308" ? [234, 179, 8] : d.color === "#ef4444" ? [239, 68, 68] : d.color === "#a855f7" ? [168, 85, 247] : [107, 114, 128],
    })), "Despesas por Categoria");
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Valor (R$)", "Percentual (%)"]],
      body: despesasBreakdown.map((d) => [d.categoria, "R$ " + d.valor.toLocaleString("pt-BR"), d.pct + "%"]),
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
      foot: [["Total", "R$ 41.400", "100%"]],
      footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: "bold", fontSize: 8 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Production Chart + Table
    checkPage(75);
    drawGroupedBarChart(doc, 20, y + 14, 170, 40,
      producaoSemanal.map((d) => ({
        label: d.dia,
        values: [d.meta, d.ovos],
        colors: [[220, 220, 220], d.ovos >= d.meta ? [34, 197, 94] : [245, 158, 11]],
      })),
      [
        { label: "Meta", color: [220, 220, 220] },
        { label: "Produção", color: [34, 197, 94] },
      ],
      "Produção Diária vs Meta"
    );
    y += 62;
    autoTable(doc, {
      startY: y,
      head: [["Dia", "Produção", "Meta", "Diferença", "Atingiu"]],
      body: producaoSemanal.map((d) => [
        d.dia,
        d.ovos.toLocaleString("pt-BR"),
        d.meta.toLocaleString("pt-BR"),
        (d.ovos - d.meta > 0 ? "+" : "") + (d.ovos - d.meta),
        d.ovos >= d.meta ? "Sim" : "Não",
      ]),
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Barn Performance
    checkPage(30);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("Performance por Galpão", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Galpão", "Ovos (semana)", "Postura (%)", "Mortes", "Eficiência (%)"]],
      body: galpaoPerformance.map((g) => [g.galpao, g.ovos.toLocaleString("pt-BR"), g.postura + "%", String(g.mortes), g.eficiencia + "%"]),
      theme: "striped",
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Mortality Bar Chart + Table
    checkPage(65);
    drawBarChart(doc, 20, y + 8, 170, 35,
      mortalidadeCausas.map((c) => ({
        label: c.causa.length > 12 ? c.causa.slice(0, 12) + "…" : c.causa,
        value: c.qtd,
        color: c.causa === "Estresse térmico" ? [239, 68, 68] : c.causa === "Respiratório" ? [249, 115, 22] : c.causa === "Predadores" ? [234, 179, 8] : [161, 161, 170],
      })),
      "Causas de Mortalidade"
    );
    y += 50;
    autoTable(doc, {
      startY: y,
      head: [["Causa", "Quantidade", "Percentual (%)"]],
      body: mortalidadeCausas.map((c) => [c.causa, String(c.qtd), c.pct + "%"]),
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Feed Chart + Table
    checkPage(75);
    drawGroupedBarChart(doc, 20, y + 14, 170, 40,
      racaoSemanal.map((d) => ({
        label: d.dia,
        values: [d.consumo, d.custo],
        colors: [[245, 158, 11], [59, 130, 246]],
      })),
      [
        { label: "Consumo (kg)", color: [245, 158, 11] },
        { label: "Custo (R$)", color: [59, 130, 246] },
      ],
      "Consumo e Custo de Ração"
    );
    y += 62;
    autoTable(doc, {
      startY: y,
      head: [["Dia", "Consumo (kg)", "Custo (R$)", "Custo/kg (R$)"]],
      body: racaoSemanal.map((d) => [d.dia, d.consumo.toLocaleString("pt-BR"), "R$ " + d.custo.toLocaleString("pt-BR"), "R$ " + (d.custo / d.consumo).toFixed(2)]),
      theme: "striped",
      headStyles: { fillColor: [168, 85, 247], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      margin: { left: 14 },
    });

    doc.save(`granja-pro-completo-${periodo.replace(" ", "-")}.pdf`);
    setShowExport(false);
  }

  async function exportExcel() {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Granja Pro";
    wb.created = new Date();
    const timestamp = new Date().toLocaleDateString("pt-BR");

    const headerFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D7A4F" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    const sectionFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    const sectionFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const totalFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    const totalFont: Partial<ExcelJS.Font> = { bold: true, size: 10 };
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
    const altFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

    function styleHeader(ws: ExcelJS.Worksheet, row: number, cols: number) {
      const r = ws.getRow(row);
      for (let c = 1; c <= cols; c++) {
        const cell = r.getCell(c);
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
      r.height = 22;
    }

    function styleSection(ws: ExcelJS.Worksheet, row: number, cols: number, text: string) {
      ws.mergeCells(row, 1, row, cols);
      const cell = ws.getCell(row, 1);
      cell.value = text;
      cell.fill = sectionFill;
      cell.font = sectionFont;
      cell.alignment = { vertical: "middle" };
      ws.getRow(row).height = 26;
    }

    function styleDataRows(ws: ExcelJS.Worksheet, startRow: number, endRow: number, cols: number) {
      for (let r = startRow; r <= endRow; r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= cols; c++) {
          const cell = row.getCell(c);
          cell.border = thinBorder;
          cell.alignment = { vertical: "middle" };
          if ((r - startRow) % 2 === 1) cell.fill = altFill;
        }
        row.height = 20;
      }
    }

    function styleTotalRow(ws: ExcelJS.Worksheet, row: number, cols: number) {
      const r = ws.getRow(row);
      for (let c = 1; c <= cols; c++) {
        const cell = r.getCell(c);
        cell.fill = totalFill;
        cell.font = totalFont;
        cell.border = thinBorder;
      }
      r.height = 22;
    }

    function addDataBars(ws: ExcelJS.Worksheet, colLetter: string, startRow: number, endRow: number, color: string) {
      const colNum = colLetter.charCodeAt(0) - 64;
      const values: number[] = [];
      for (let r = startRow; r <= endRow; r++) {
        const v = ws.getRow(r).getCell(colNum).value;
        values.push(typeof v === "number" ? v : 0);
      }
      const max = Math.max(...values);
      if (max === 0) return;
      for (let r = startRow; r <= endRow; r++) {
        const pct = Math.round((values[r - startRow] / max) * 100);
        const cell = ws.getRow(r).getCell(colNum);
        const opacity = Math.round((pct / 100) * 80) + 20;
        const alpha = Math.round((opacity / 100) * 255).toString(16).padStart(2, "0").toUpperCase();
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: alpha + color.slice(2) } };
        cell.font = { bold: typeof cell.font === "object" && cell.font?.bold ? true : false, size: 10, color: { argb: "FF1E293B" } };
      }
    }

    // =============================================
    // SHEET 1: Resumo Geral
    // =============================================
    const ws1 = wb.addWorksheet("Resumo Geral", { views: [{ state: "frozen", ySplit: 0, xSplit: 0 }] });
    ws1.columns = [
      { width: 24 }, { width: 22 }, { width: 22 }, { width: 24 }, { width: 18 }, { width: 18 },
    ];

    // Title
    ws1.mergeCells("A1:F1");
    const titleCell = ws1.getCell("A1");
    titleCell.value = "GRANJA PRO — RELATÓRIO COMPLETO";
    titleCell.font = { bold: true, size: 16, color: { argb: "FF1E293B" } };
    titleCell.alignment = { vertical: "middle" };
    ws1.getRow(1).height = 32;

    ws1.mergeCells("A2:B2");
    ws1.getCell("A2").value = `Período: ${periodo}`;
    ws1.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };
    ws1.mergeCells("C2:D2");
    ws1.getCell("C2").value = `Gerado em: ${timestamp}`;
    ws1.getCell("C2").font = { size: 10, color: { argb: "FF64748B" } };
    ws1.mergeCells("E2:F2");
    ws1.getCell("E2").value = `Saúde: ${healthScore}/100 (${scoreStyle.label})`;
    ws1.getCell("E2").font = { bold: true, size: 10, color: { argb: healthScore >= 80 ? "FF16A34A" : healthScore >= 60 ? "FFD97706" : "FFDC2626" } };

    // KPIs
    let row = 4;
    styleSection(ws1, row, 6, "INDICADORES PRINCIPAIS");
    row++;
    ws1.getRow(row).values = ["Indicador", "Valor", "Variação", "Detalhe", "", ""];
    styleHeader(ws1, row, 4);
    row++;
    const kpis = [
      ["Lucro Mensal", "R$ 2.100", -32.3, "Margem: 4,8%"],
      ["Produção Semanal", "29.980 ovos", 3.2, "Postura: 88,3%"],
      ["Mortalidade", "0,15%", -8.2, "16 óbitos na semana"],
      ["Eficiência Ração", "R$ 0,64/ovo", -3.1, "Custo por ovo"],
    ];
    kpis.forEach((k, i) => {
      ws1.getRow(row + i).values = [k[0], k[1], k[2], k[3]];
      const varCell = ws1.getCell(row + i, 3);
      const val = k[2] as number;
      const isKpiGood = k[0] === "Mortalidade" ? val <= 0 : val >= 0;
      varCell.value = (val > 0 ? "+" : "") + val + "%";
      varCell.font = { bold: true, color: { argb: isKpiGood ? "FF16A34A" : "FFDC2626" } };
    });
    styleDataRows(ws1, row, row + 3, 4);
    row += 5;

    // Insights
    styleSection(ws1, row, 6, "ALERTAS E AÇÕES RECOMENDADAS");
    row++;
    ws1.getRow(row).values = ["Prioridade", "Alerta", "", "Ação Recomendada", "", ""];
    styleHeader(ws1, row, 4);
    row++;
    insights.forEach((ins, i) => {
      const r = ws1.getRow(row + i);
      r.values = [
        ins.level === "critical" ? "URGENTE" : ins.level === "warning" ? "ATENÇÃO" : "POSITIVO",
        ins.title + " — " + ins.description,
        "",
        ins.action,
      ];
      const pCell = r.getCell(1);
      pCell.font = { bold: true, color: { argb: ins.level === "critical" ? "FFDC2626" : ins.level === "warning" ? "FFD97706" : "FF16A34A" } };
      pCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ins.level === "critical" ? "FFFEE2E2" : ins.level === "warning" ? "FFFEF3C7" : "FFDCFCE7" } };
    });
    styleDataRows(ws1, row, row + insights.length - 1, 4);
    row += insights.length + 1;

    // Profit Trend
    styleSection(ws1, row, 6, "EVOLUÇÃO DO LUCRO");
    row++;
    ws1.getRow(row).values = ["Mês", "Receita (R$)", "Despesas (R$)", "Lucro (R$)", "Margem (%)", ""];
    styleHeader(ws1, row, 5);
    row++;
    const lucroStart = row;
    lucroTrend.forEach((d, i) => {
      ws1.getRow(row + i).values = [d.periodo, d.receita, d.despesa, d.lucro, +((d.lucro / d.receita) * 100).toFixed(1)];
    });
    styleDataRows(ws1, lucroStart, lucroStart + lucroTrend.length - 1, 5);
    addDataBars(ws1, "B", lucroStart, lucroStart + lucroTrend.length - 1, "FF22C55E");
    addDataBars(ws1, "C", lucroStart, lucroStart + lucroTrend.length - 1, "FFEF4444");
    addDataBars(ws1, "D", lucroStart, lucroStart + lucroTrend.length - 1, "FF6366F1");
    row = lucroStart + lucroTrend.length;
    ws1.getRow(row).values = ["TOTAL", lucroTrend.reduce((s, d) => s + d.receita, 0), lucroTrend.reduce((s, d) => s + d.despesa, 0), lucroTrend.reduce((s, d) => s + d.lucro, 0), ""];
    styleTotalRow(ws1, row, 5);
    row += 2;

    // Barn Performance
    styleSection(ws1, row, 6, "PERFORMANCE POR GALPÃO");
    row++;
    ws1.getRow(row).values = ["Galpão", "Ovos (semana)", "Postura (%)", "Mortes", "Eficiência (%)", "Status"];
    styleHeader(ws1, row, 6);
    row++;
    const galpaoStart = row;
    galpaoPerformance.forEach((g, i) => {
      const r = ws1.getRow(row + i);
      r.values = [g.galpao, g.ovos, g.postura, g.mortes, g.eficiencia, g.eficiencia >= 85 ? "Bom" : g.eficiencia >= 70 ? "Atenção" : "Crítico"];
      const statusCell = r.getCell(6);
      statusCell.font = { bold: true, color: { argb: g.eficiencia >= 85 ? "FF16A34A" : g.eficiencia >= 70 ? "FFD97706" : "FFDC2626" } };
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: g.eficiencia >= 85 ? "FFDCFCE7" : g.eficiencia >= 70 ? "FFFEF3C7" : "FFFEE2E2" } };
      if (g.mortes > 5) r.getCell(4).font = { bold: true, color: { argb: "FFDC2626" } };
    });
    styleDataRows(ws1, galpaoStart, galpaoStart + galpaoPerformance.length - 1, 6);
    addDataBars(ws1, "E", galpaoStart, galpaoStart + galpaoPerformance.length - 1, "FF22C55E");
    row = galpaoStart + galpaoPerformance.length + 1;

    // Expenses
    styleSection(ws1, row, 6, "DESPESAS POR CATEGORIA");
    row++;
    ws1.getRow(row).values = ["Categoria", "Valor (R$)", "Percentual (%)", "", "", ""];
    styleHeader(ws1, row, 3);
    row++;
    const despStart = row;
    despesasBreakdown.forEach((d, i) => {
      ws1.getRow(row + i).values = [d.categoria, d.valor, d.pct];
    });
    styleDataRows(ws1, despStart, despStart + despesasBreakdown.length - 1, 3);
    addDataBars(ws1, "B", despStart, despStart + despesasBreakdown.length - 1, "FF3B82F6");
    addDataBars(ws1, "C", despStart, despStart + despesasBreakdown.length - 1, "FF3B82F6");
    row = despStart + despesasBreakdown.length;
    ws1.getRow(row).values = ["TOTAL", 41400, 100];
    styleTotalRow(ws1, row, 3);
    row += 2;

    // Mortality
    styleSection(ws1, row, 6, "CAUSAS DE MORTALIDADE (últimos 30 dias)");
    row++;
    ws1.getRow(row).values = ["#", "Causa", "Quantidade", "Percentual (%)", "", ""];
    styleHeader(ws1, row, 4);
    row++;
    const mortStart = row;
    mortalidadeCausas.forEach((c, i) => {
      ws1.getRow(row + i).values = [i + 1, c.causa, c.qtd, c.pct];
    });
    styleDataRows(ws1, mortStart, mortStart + mortalidadeCausas.length - 1, 4);
    addDataBars(ws1, "C", mortStart, mortStart + mortalidadeCausas.length - 1, "FFEF4444");
    row = mortStart + mortalidadeCausas.length + 1;

    // Production vs Meta
    styleSection(ws1, row, 6, "PRODUÇÃO DIÁRIA VS META");
    row++;
    ws1.getRow(row).values = ["Dia", "Produção", "Meta", "Diferença", "Atingiu", ""];
    styleHeader(ws1, row, 5);
    row++;
    const prodStart = row;
    producaoSemanal.forEach((d, i) => {
      const r = ws1.getRow(row + i);
      r.values = [d.dia, d.ovos, d.meta, d.ovos - d.meta, d.ovos >= d.meta ? "Sim" : "Não"];
      const atingiuCell = r.getCell(5);
      atingiuCell.font = { bold: true, color: { argb: d.ovos >= d.meta ? "FF16A34A" : "FFDC2626" } };
      atingiuCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: d.ovos >= d.meta ? "FFDCFCE7" : "FFFEE2E2" } };
    });
    styleDataRows(ws1, prodStart, prodStart + producaoSemanal.length - 1, 5);
    addDataBars(ws1, "B", prodStart, prodStart + producaoSemanal.length - 1, "FF22C55E");
    row = prodStart + producaoSemanal.length;
    ws1.getRow(row).values = ["TOTAL", producaoSemanal.reduce((s, d) => s + d.ovos, 0), "", "", ""];
    styleTotalRow(ws1, row, 5);
    row++;
    ws1.getRow(row).values = ["Média Diária", Math.round(producaoSemanal.reduce((s, d) => s + d.ovos, 0) / 7), "", "", ""];
    ws1.getRow(row).getCell(1).font = { bold: true };
    row += 2;

    // Feed
    styleSection(ws1, row, 6, "CONSUMO E CUSTO DE RAÇÃO");
    row++;
    ws1.getRow(row).values = ["Dia", "Consumo (kg)", "Custo (R$)", "Custo/kg (R$)", "", ""];
    styleHeader(ws1, row, 4);
    row++;
    const racStart = row;
    racaoSemanal.forEach((d, i) => {
      ws1.getRow(row + i).values = [d.dia, d.consumo, d.custo, +(d.custo / d.consumo).toFixed(2)];
    });
    styleDataRows(ws1, racStart, racStart + racaoSemanal.length - 1, 4);
    addDataBars(ws1, "B", racStart, racStart + racaoSemanal.length - 1, "FFF59E0B");
    addDataBars(ws1, "C", racStart, racStart + racaoSemanal.length - 1, "FF3B82F6");
    row = racStart + racaoSemanal.length;
    ws1.getRow(row).values = ["TOTAL", racaoSemanal.reduce((s, d) => s + d.consumo, 0), racaoSemanal.reduce((s, d) => s + d.custo, 0), ""];
    styleTotalRow(ws1, row, 4);

    // =============================================
    // SHEET 2: Evolução do Lucro
    // =============================================
    const ws2 = wb.addWorksheet("Evolução do Lucro", { views: [{ state: "frozen", ySplit: 1 }] });
    ws2.columns = [{ width: 12 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 14 }];
    ws2.getRow(1).values = ["Mês", "Receita (R$)", "Despesas (R$)", "Lucro (R$)", "Margem (%)"];
    styleHeader(ws2, 1, 5);
    lucroTrend.forEach((d, i) => {
      ws2.getRow(i + 2).values = [d.periodo, d.receita, d.despesa, d.lucro, +((d.lucro / d.receita) * 100).toFixed(1)];
    });
    styleDataRows(ws2, 2, 1 + lucroTrend.length, 5);
    addDataBars(ws2, "B", 2, 1 + lucroTrend.length, "FF22C55E");
    addDataBars(ws2, "C", 2, 1 + lucroTrend.length, "FFEF4444");
    addDataBars(ws2, "D", 2, 1 + lucroTrend.length, "FF6366F1");
    const lucroTotalRow = lucroTrend.length + 2;
    ws2.getRow(lucroTotalRow).values = ["TOTAL", lucroTrend.reduce((s, d) => s + d.receita, 0), lucroTrend.reduce((s, d) => s + d.despesa, 0), lucroTrend.reduce((s, d) => s + d.lucro, 0), ""];
    styleTotalRow(ws2, lucroTotalRow, 5);

    // =============================================
    // SHEET 3: Performance Galpões
    // =============================================
    const ws3 = wb.addWorksheet("Performance Galpões", { views: [{ state: "frozen", ySplit: 1 }] });
    ws3.columns = [{ width: 18 }, { width: 18 }, { width: 14 }, { width: 12 }, { width: 16 }, { width: 14 }];
    ws3.getRow(1).values = ["Galpão", "Ovos (semana)", "Postura (%)", "Mortes", "Eficiência (%)", "Status"];
    styleHeader(ws3, 1, 6);
    galpaoPerformance.forEach((g, i) => {
      const r = ws3.getRow(i + 2);
      r.values = [g.galpao, g.ovos, g.postura, g.mortes, g.eficiencia, g.eficiencia >= 85 ? "Bom" : g.eficiencia >= 70 ? "Atenção" : "Crítico"];
      r.getCell(6).font = { bold: true, color: { argb: g.eficiencia >= 85 ? "FF16A34A" : g.eficiencia >= 70 ? "FFD97706" : "FFDC2626" } };
      r.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: g.eficiencia >= 85 ? "FFDCFCE7" : g.eficiencia >= 70 ? "FFFEF3C7" : "FFFEE2E2" } };
      if (g.mortes > 5) r.getCell(4).font = { bold: true, color: { argb: "FFDC2626" } };
    });
    styleDataRows(ws3, 2, 1 + galpaoPerformance.length, 6);
    addDataBars(ws3, "B", 2, 1 + galpaoPerformance.length, "FF22C55E");
    addDataBars(ws3, "E", 2, 1 + galpaoPerformance.length, "FF22C55E");

    // =============================================
    // SHEET 4: Despesas
    // =============================================
    const ws4 = wb.addWorksheet("Despesas por Categoria", { views: [{ state: "frozen", ySplit: 1 }] });
    ws4.columns = [{ width: 20 }, { width: 18 }, { width: 16 }];
    ws4.getRow(1).values = ["Categoria", "Valor (R$)", "Percentual (%)"];
    styleHeader(ws4, 1, 3);
    despesasBreakdown.forEach((d, i) => {
      ws4.getRow(i + 2).values = [d.categoria, d.valor, d.pct];
    });
    styleDataRows(ws4, 2, 1 + despesasBreakdown.length, 3);
    addDataBars(ws4, "B", 2, 1 + despesasBreakdown.length, "FF3B82F6");
    addDataBars(ws4, "C", 2, 1 + despesasBreakdown.length, "FF3B82F6");
    const despTotalRow = despesasBreakdown.length + 2;
    ws4.getRow(despTotalRow).values = ["TOTAL", 41400, 100];
    styleTotalRow(ws4, despTotalRow, 3);

    // =============================================
    // SHEET 5: Mortalidade
    // =============================================
    const ws5 = wb.addWorksheet("Causas Mortalidade", { views: [{ state: "frozen", ySplit: 1 }] });
    ws5.columns = [{ width: 6 }, { width: 24 }, { width: 16 }, { width: 16 }];
    ws5.getRow(1).values = ["#", "Causa", "Quantidade", "Percentual (%)"];
    const mortHeaderFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEF4444" } };
    const r1 = ws5.getRow(1);
    for (let c = 1; c <= 4; c++) { r1.getCell(c).fill = mortHeaderFill; r1.getCell(c).font = headerFont; r1.getCell(c).border = thinBorder; r1.getCell(c).alignment = { vertical: "middle", horizontal: "center" }; }
    r1.height = 22;
    mortalidadeCausas.forEach((c, i) => {
      ws5.getRow(i + 2).values = [i + 1, c.causa, c.qtd, c.pct];
    });
    styleDataRows(ws5, 2, 1 + mortalidadeCausas.length, 4);
    addDataBars(ws5, "C", 2, 1 + mortalidadeCausas.length, "FFEF4444");

    // =============================================
    // SHEET 6: Produção vs Meta
    // =============================================
    const ws6 = wb.addWorksheet("Produção vs Meta", { views: [{ state: "frozen", ySplit: 1 }] });
    ws6.columns = [{ width: 12 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 12 }];
    ws6.getRow(1).values = ["Dia", "Produção", "Meta", "Diferença", "Atingiu"];
    const prodHeaderFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } };
    const rp1 = ws6.getRow(1);
    for (let c = 1; c <= 5; c++) { rp1.getCell(c).fill = prodHeaderFill; rp1.getCell(c).font = headerFont; rp1.getCell(c).border = thinBorder; rp1.getCell(c).alignment = { vertical: "middle", horizontal: "center" }; }
    rp1.height = 22;
    producaoSemanal.forEach((d, i) => {
      const r = ws6.getRow(i + 2);
      r.values = [d.dia, d.ovos, d.meta, d.ovos - d.meta, d.ovos >= d.meta ? "Sim" : "Não"];
      r.getCell(5).font = { bold: true, color: { argb: d.ovos >= d.meta ? "FF16A34A" : "FFDC2626" } };
      r.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: d.ovos >= d.meta ? "FFDCFCE7" : "FFFEE2E2" } };
    });
    styleDataRows(ws6, 2, 1 + producaoSemanal.length, 5);
    addDataBars(ws6, "B", 2, 1 + producaoSemanal.length, "FF22C55E");
    const prodTRow = producaoSemanal.length + 2;
    ws6.getRow(prodTRow).values = ["TOTAL", producaoSemanal.reduce((s, d) => s + d.ovos, 0), "", "", ""];
    styleTotalRow(ws6, prodTRow, 5);
    ws6.getRow(prodTRow + 1).values = ["Média", Math.round(producaoSemanal.reduce((s, d) => s + d.ovos, 0) / 7), "", "", ""];
    ws6.getRow(prodTRow + 1).getCell(1).font = { bold: true };

    // =============================================
    // SHEET 7: Ração
    // =============================================
    const ws7 = wb.addWorksheet("Consumo de Ração", { views: [{ state: "frozen", ySplit: 1 }] });
    ws7.columns = [{ width: 12 }, { width: 18 }, { width: 16 }, { width: 16 }];
    ws7.getRow(1).values = ["Dia", "Consumo (kg)", "Custo (R$)", "Custo/kg (R$)"];
    const racHeaderFill: ExcelJS.FillPattern = { type: "pattern", pattern: "solid", fgColor: { argb: "FFA855F7" } };
    const rr1 = ws7.getRow(1);
    for (let c = 1; c <= 4; c++) { rr1.getCell(c).fill = racHeaderFill; rr1.getCell(c).font = headerFont; rr1.getCell(c).border = thinBorder; rr1.getCell(c).alignment = { vertical: "middle", horizontal: "center" }; }
    rr1.height = 22;
    racaoSemanal.forEach((d, i) => {
      ws7.getRow(i + 2).values = [d.dia, d.consumo, d.custo, +(d.custo / d.consumo).toFixed(2)];
    });
    styleDataRows(ws7, 2, 1 + racaoSemanal.length, 4);
    addDataBars(ws7, "B", 2, 1 + racaoSemanal.length, "FFF59E0B");
    addDataBars(ws7, "C", 2, 1 + racaoSemanal.length, "FF3B82F6");
    const racTRow = racaoSemanal.length + 2;
    ws7.getRow(racTRow).values = ["TOTAL", racaoSemanal.reduce((s, d) => s + d.consumo, 0), racaoSemanal.reduce((s, d) => s + d.custo, 0), ""];
    styleTotalRow(ws7, racTRow, 4);

    // Save
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `granja-pro-completo-${periodo.replace(" ", "-")}.xlsx`);
    setShowExport(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Relatórios</h1>
            <p className="text-sm text-gray-500 mt-0.5">Veja o que importa. Aja com confiança.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => { setShowPeriodo(!showPeriodo); setShowExport(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              {periodo}
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {showPeriodo && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[130px]">
                {periodos.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriodo(p); setShowPeriodo(false); }}
                    className={cn(
                      "block w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer",
                      p === periodo ? "text-indigo-600 bg-indigo-50 font-semibold" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => { setShowExport(!showExport); setShowPeriodo(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm shadow-brand-600/20"
            >
              <Download className="w-4 h-4" />
              Exportar
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-10 min-w-[180px]">
                <button onClick={exportPDF} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  <FileDown className="w-4 h-4 text-red-500" />
                  Exportar PDF
                </button>
                <button onClick={exportExcel} className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                  <Sheet className="w-4 h-4 text-emerald-600" />
                  Exportar Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Health Score + Top KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Health Score */}
        <div className={cn("lg:col-span-1 rounded-2xl border p-5 flex flex-col items-center justify-center gap-2", scoreStyle.bg, scoreStyle.bg === "bg-emerald-50" ? "border-emerald-200" : scoreStyle.bg === "bg-amber-50" ? "border-amber-200" : "border-red-200")}>
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                className={scoreStyle.ring}
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(healthScore / 100) * 213.6} 213.6`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-2xl font-bold", scoreStyle.text)}>{healthScore}</span>
            </div>
          </div>
          <span className={cn("text-xs font-bold", scoreStyle.text)}>{scoreStyle.label}</span>
          <span className="text-[10px] text-gray-400 font-medium">Saúde da Granja</span>
        </div>

        {/* KPIs */}
        <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Lucro Mensal", value: "R$ 2.100", change: -32.3, icon: DollarSign, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", sub: "Margem: 4,8%" },
            { label: "Produção Semanal", value: "29.980", change: 3.2, icon: Egg, iconBg: "bg-amber-50", iconColor: "text-amber-600", sub: "Postura: 88,3%" },
            { label: "Mortalidade", value: "0,15%", change: -8.2, icon: Activity, iconBg: "bg-red-50", iconColor: "text-red-500", sub: "16 óbitos na semana" },
            { label: "Eficiência Ração", value: "R$ 0,64", change: -3.1, icon: Zap, iconBg: "bg-blue-50", iconColor: "text-blue-600", sub: "Custo por ovo" },
          ].map((kpi) => {
            const isPositive = kpi.label === "Mortalidade" ? kpi.change <= 0 : kpi.change >= 0;
            return (
              <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", kpi.iconBg)}>
                    <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
                  </div>
                  <div className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                    isPositive ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                  )}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.change)}%
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">{kpi.label}</p>
                <p className="text-[11px] text-gray-500 mt-1.5 font-medium">{kpi.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Insights */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">O que fazer agora</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((insight, i) => {
            const cfg = insightConfig[insight.level];
            const Icon = cfg.icon;
            return (
              <div key={i} className={cn("rounded-2xl border p-4 transition-all duration-200", cfg.bg, cfg.border)}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={cn("w-5 h-5", cfg.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={cn("text-sm font-bold", cfg.titleColor)}>{insight.title}</h3>
                      {insight.metric && (
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0", cfg.metricBg, cfg.metricText)}>
                          {insight.metric}
                        </span>
                      )}
                    </div>
                    <p className={cn("text-xs leading-relaxed mb-2", cfg.descColor)}>{insight.description}</p>
                    <div className={cn("inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg", cfg.actionBg, cfg.actionText)}>
                      <ArrowRight className="w-3 h-3" />
                      {insight.action}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Profit Trend (the most important chart) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Evolução do Lucro</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Receita, despesas e lucro líquido nos últimos meses</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receita</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Despesas</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-1 rounded bg-indigo-500" /> Lucro</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={lucroTrend}>
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
            <Tooltip contentStyle={customTooltipStyle} formatter={(value: unknown) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
            <Area type="monotone" dataKey="receita" stroke="#22c55e" strokeWidth={2} fill="url(#colorReceita)" />
            <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} fill="url(#colorDespesa)" />
            <Line type="monotone" dataKey="lucro" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: "#6366f1", r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Barn Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Performance por Galpão</h3>
          <div className="space-y-3">
            {galpaoPerformance.map((g) => {
              const isGood = g.eficiencia >= 85;
              return (
                <div key={g.galpao} className="rounded-xl border border-gray-100 p-3.5 hover:border-gray-200 transition-colors">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-sm font-bold text-gray-900">{g.galpao}</span>
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full",
                      isGood ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    )}>
                      {g.eficiencia}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Ovos</p>
                      <p className="text-sm font-bold text-gray-800">{g.ovos.toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Postura</p>
                      <p className="text-sm font-bold text-gray-800">{g.postura}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Mortes</p>
                      <p className={cn("text-sm font-bold", g.mortes > 5 ? "text-red-600" : "text-gray-800")}>{g.mortes}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 rounded-full bg-gray-100">
                    <div
                      className={cn("h-1.5 rounded-full transition-all", isGood ? "bg-emerald-500" : "bg-amber-500")}
                      style={{ width: `${g.eficiencia}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense Breakdown + Mortality Causes */}
        <div className="space-y-4">
          {/* Expenses */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Para onde vai o dinheiro</h3>
              <span className="text-xs text-gray-400 font-medium">Total: R$ 41.400</span>
            </div>
            <div className="space-y-2.5">
              {despesasBreakdown.map((d) => (
                <div key={d.categoria} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-gray-600 w-24 flex-shrink-0">{d.categoria}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-20 text-right">R$ {d.valor.toLocaleString("pt-BR")}</span>
                  <span className="text-[10px] text-gray-400 w-10 text-right">{d.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mortality causes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Causas de mortalidade</h3>
              <span className="text-xs text-gray-400 font-medium">Últimos 30 dias</span>
            </div>
            <div className="space-y-2">
              {mortalidadeCausas.map((c, i) => (
                <div key={c.causa} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-gray-300 w-4 text-right">{i + 1}</span>
                  <span className="text-xs text-gray-600 flex-1">{c.causa}</span>
                  <div className="w-24 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: i === 0 ? "#ef4444" : i === 1 ? "#f97316" : "#d4d4d8",
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-6 text-right">{c.qtd}</span>
                  <span className="text-[10px] text-gray-400 w-10 text-right">{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Production vs Meta (compact) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Produção Diária vs Meta</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Acompanhe se a produção está atingindo o objetivo</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand-500" /> Produção</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Meta</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={producaoSemanal} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dia" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} domain={[3800, 4600]} />
            <Tooltip contentStyle={customTooltipStyle} />
            <Bar dataKey="meta" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="ovos" radius={[4, 4, 0, 0]} barSize={24}>
              {producaoSemanal.map((entry, i) => (
                <Cell key={i} fill={entry.ovos >= entry.meta ? "#22c55e" : "#f59e0b"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
