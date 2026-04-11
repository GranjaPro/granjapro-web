$path = "C:\Users\Bernardo Timo\OneDrive\Desktop\teste_agro1\app\dashboard\flocks\detalhes\[loteId]\racao\page.tsx"
$content = Get-Content -LiteralPath $path -Raw

$replacements = @(
  [pscustomobject]@{ bad = @'PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©-postura'@; good = "Pré-postura" },
  [pscustomobject]@{ bad = @'ProduÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o inicial'@; good = "Produção inicial" },
  [pscustomobject]@{ bad = @'Pico de produÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o'@; good = "Pico de produção" },
  [pscustomobject]@{ bad = @'EstÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡vel'@; good = "Estável" },
  [pscustomobject]@{ bad = @'DeclÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nio'@; good = "Declínio" },
  [pscustomobject]@{ bad = @'PrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©-inicial'@; good = "Pré-inicial" },
  [pscustomobject]@{ bad = @'TransiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o'@; good = "Transição" },
  [pscustomobject]@{ bad = @'ManutenÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o'@; good = "Manutenção" },
  [pscustomobject]@{ bad = @'NÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o informado'@; good = "Não informado" },
  [pscustomobject]@{ bad = @'desperdÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âcio'@; good = "desperdício" },
  [pscustomobject]@{ bad = @'raÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o caiu no perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo'@; good = "ração caiu no período" },
  [pscustomobject]@{ bad = @'fÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³rmula'@; good = "fórmula" },
  [pscustomobject]@{ bad = @'Lote nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o encontrado.'@; good = "Lote não encontrado." },
  [pscustomobject]@{ bad = @'RaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o'@; good = "Ração" },
  [pscustomobject]@{ bad = @'SaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºde alimentar do lote'@; good = "Saúde alimentar do lote" },
  [pscustomobject]@{ bad = @'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ Consumo por ave vs fase do lote'@; good = "• Consumo por ave vs fase do lote" },
  [pscustomobject]@{ bad = @'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ TendÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªncia recente de consumo'@; good = "• Tendência recente de consumo" },
  [pscustomobject]@{ bad = @'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¢ PressÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o de custo alimentar'@; good = "• Pressão de custo alimentar" },
  [pscustomobject]@{ bad = @'RecomendaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âµes automÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ticas'@; good = "Recomendações automáticas" },
  [pscustomobject]@{ bad = @'Nenhum lanÃƒÂ§amento feito'@; good = "Nenhum lançamento feito" },
  [pscustomobject]@{ bad = @'MÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©dia ponderada do perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo'@; good = "Média ponderada do período" },
  [pscustomobject]@{ bad = @'ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â'@; good = "—" },
  [pscustomobject]@{ bad = @'ovos mockados no perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo'@; good = "ovos mockados no período" },
  [pscustomobject]@{ bad = @'HistÃ³rico de consumo por ave'@; good = "Histórico de consumo por ave" },
  [pscustomobject]@{ bad = @'Ãšltimos 7 dias'@; good = "Últimos 7 dias" },
  [pscustomobject]@{ bad = @'Ãšltimos 30 dias'@; good = "Últimos 30 dias" },
  [pscustomobject]@{ bad = @'DistribuiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o por tipo de raÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o'@; good = "Distribuição por tipo de ração" },
  [pscustomobject]@{ bad = @'ParticipaÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o dos lanÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â§amentos mockados do perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo'@; good = "Participação dos lançamentos mockados do período" },
  [pscustomobject]@{ bad = @'Comparativo consolidado por mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªs'@; good = "Comparativo consolidado por mês" },
  [pscustomobject]@{ bad = @'tipos mockados no perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo'@; good = "tipos mockados no período" },
  [pscustomobject]@{ bad = @'TendÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âªncia'@; good = "Tendência" },
  [pscustomobject]@{ bad = @'ConversÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â£o atual:'@; good = "Conversão atual:" },
  [pscustomobject]@{ bad = @'MÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©dia diÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ria de'@; good = "Média diária de" },
  [pscustomobject]@{ bad = @'sem ovos no perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo'@; good = "sem ovos no período" },
  [pscustomobject]@{ bad = @'Sem registros no perÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­odo'@; good = "Sem registros no período" }
)

foreach ($item in $replacements) {
  $content = $content.Replace($item.bad, $item.good)
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8)
