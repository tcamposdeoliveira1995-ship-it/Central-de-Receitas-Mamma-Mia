"use client";

import { Document, Page, View, Text, Image, StyleSheet, Font, Svg, Polygon, Rect } from "@react-pdf/renderer";
import { formatBRL, formatNumber } from "@/lib/calc";
import { LABEL_TIPO_RECEITA } from "@/lib/tiposReceita";
import { calcularAlertasRotulagem } from "@/lib/rotulagemFrontal";

const CORES = {
  gold: "#b8863b",
  sage: "#5f6f52",
  texto: "#2b2620",
  muted: "#7a7268",
  linha: "#e4dccf",
  fundoSuave: "#f7f1e7",
  brick: "#a8452f",
};

const styles = StyleSheet.create({
  page: {
    padding: 54,
    fontSize: 11.5,
    color: CORES.texto,
    fontFamily: "Helvetica",
  },
  marcaDagua: {
    position: "absolute",
    top: "28%",
    left: "22%",
    width: 340,
    opacity: 0.06,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: CORES.linha,
  },
  logoPequeno: { width: 64, height: 64 },
  codigo: { fontSize: 9.5, color: CORES.muted, fontFamily: "Helvetica" },
  titulo: { fontSize: 26, fontFamily: "Helvetica-Bold", marginTop: 4 },
  empresa: { fontSize: 12, color: CORES.muted, marginTop: 3 },
  badge: {
    fontSize: 9,
    color: CORES.sage,
    backgroundColor: "#e7ecdf",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: "flex-end",
  },
  secaoTitulo: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: CORES.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 28,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: CORES.linha,
    paddingBottom: 5,
  },
  tabelaHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: CORES.texto,
    paddingBottom: 7,
    marginBottom: 4,
  },
  tabelaHeaderCel: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: CORES.muted },
  tabelaLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: CORES.linha,
    paddingVertical: 8,
  },
  celNome: { width: "26%", fontSize: 11 },
  celApres: { width: "14%", fontSize: 11 },
  celObs: { width: "14%", fontSize: 11 },
  celQtde: { width: "12%", textAlign: "right", fontSize: 11 },
  celUnid: { width: "8%", fontSize: 11 },
  celValorUnit: { width: "13%", textAlign: "right", fontSize: 11 },
  celValor: { width: "13%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 11 },
  // Larguras usadas quando o PDF é gerado sem custos (colunas de valor
  // somem e as colunas restantes crescem pra preencher a linha toda).
  celNomeSemCusto: { width: "36%", fontSize: 11 },
  celApresSemCusto: { width: "20%", fontSize: 11 },
  celObsSemCusto: { width: "20%", fontSize: 11 },
  celQtdeSemCusto: { width: "14%", textAlign: "right", fontSize: 11 },
  celUnidSemCusto: { width: "10%", fontSize: 11 },
  totaisRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 34,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: CORES.linha,
  },
  totalBloco: { alignItems: "flex-end" },
  totalLabel: { fontSize: 9, color: CORES.muted, textTransform: "uppercase" },
  totalValor: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 3 },
  cmvDestaque: {
    marginTop: 16,
    padding: 16,
    backgroundColor: CORES.fundoSuave,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cmvLabel: { fontSize: 11, color: CORES.muted },
  cmvValor: { fontSize: 22, fontFamily: "Helvetica-Bold", color: CORES.sage },
  preparoTexto: { fontSize: 11.5, lineHeight: 1.9, color: CORES.texto },
  produtoBox: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: CORES.linha,
    borderRadius: 6,
  },
  produtoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  produtoCodigo: { fontSize: 9.5, color: CORES.muted },
  produtoNome: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  produtoTipoBadge: {
    fontSize: 8.5,
    color: CORES.sage,
    backgroundColor: "#e7ecdf",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  camposGrid: { flexDirection: "row", flexWrap: "wrap" },
  campoBloco: { width: "25%", marginBottom: 9, paddingRight: 6 },
  campoLabel: { fontSize: 7.5, color: CORES.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  campoValor: { fontSize: 10, marginTop: 2 },
  apelidoTexto: { fontSize: 10, marginTop: 4, marginBottom: 2 },
  custoPacoteTexto: { fontSize: 9.5, marginTop: 2, marginBottom: 4, color: CORES.sage, fontFamily: "Helvetica-Bold" },
  ingredientesTexto: { fontSize: 9, lineHeight: 1.6, color: CORES.texto, marginTop: 6 },
  alergicosTexto: { fontSize: 9, lineHeight: 1.6, color: CORES.brick, marginTop: 4 },
  nutriTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: CORES.muted, marginTop: 10, marginBottom: 6 },
  nutriHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: CORES.texto,
    paddingBottom: 4,
    marginBottom: 2,
  },
  nutriHeaderCel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", color: CORES.muted },
  nutriLinha: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: CORES.linha,
    paddingVertical: 4,
  },
  nutriNome: { width: "40%", fontSize: 9.5 },
  nutriQtd: { width: "20%", textAlign: "right", fontSize: 9.5 },
  nutriPorcao: { width: "20%", textAlign: "right", fontSize: 9.5 },
  nutriVd: { width: "20%", textAlign: "right", fontSize: 9.5 },
  alertasTitulo: { fontSize: 7.5, color: CORES.muted, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 10, marginBottom: 5 },
  alertasRow: { flexDirection: "row", flexWrap: "wrap" },
  lupaBox: { width: 44, marginRight: 12, marginBottom: 6 },
  alertasRodape: { fontSize: 7, color: CORES.muted, marginTop: 4 },
  rodape: {
    position: "absolute",
    bottom: 30,
    left: 54,
    right: 54,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    fontSize: 9,
    color: CORES.muted,
    borderTopWidth: 0.5,
    borderTopColor: CORES.linha,
    paddingTop: 8,
  },
});

// Selo de rotulagem nutricional frontal (RDC 429/2020 / IN 75/2020) desenhado
// em SVG: um octógono preto (o "lente" da lupa) com uma alça retangular
// rotacionada saindo do canto inferior direito, e o texto branco
// centralizado dentro do octógono ("ALTO EM" + o nutriente).
function LupaRotulagemPDF({ linhas }) {
  return (
    <Svg width="44" height="56" viewBox="0 0 44 56">
      <Polygon points="13.2,0 30.8,0 44,13.2 44,30.8 30.8,44 13.2,44 0,30.8 0,13.2" fill="#000000" />
      <Rect x="30" y="36" width="7" height="18" rx="2" fill="#000000" transform="rotate(45, 33.5, 45)" />
      <Text x="22" y="16" textAnchor="middle" fontSize="4.2" fontFamily="Helvetica-Bold" fill="#ffffff">ALTO EM</Text>
      {linhas.map((linha, i) => (
        <Text
          key={i}
          x="22"
          y={24 + i * 7}
          textAnchor="middle"
          fontSize="5.2"
          fontFamily="Helvetica-Bold"
          fill="#ffffff"
        >
          {linha}
        </Text>
      ))}
    </Svg>
  );
}

export function FichaReceitaPDF({ receita, itens, cmv, quantidadeProducao, nomeItem, apresentacaoLabel, valorUnitario, unidadePreco, valorTotal, mostrarCustos = true }) {
  const geradoEm = new Date().toLocaleDateString("pt-BR");
  const celNome = mostrarCustos ? styles.celNome : styles.celNomeSemCusto;
  const celApres = mostrarCustos ? styles.celApres : styles.celApresSemCusto;
  const celObs = mostrarCustos ? styles.celObs : styles.celObsSemCusto;
  const celQtde = mostrarCustos ? styles.celQtde : styles.celQtdeSemCusto;
  const celUnid = mostrarCustos ? styles.celUnid : styles.celUnidSemCusto;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src="/logo-fundo.png" style={styles.marcaDagua} fixed />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.codigo}>{receita.codigo} · v{receita.versao_atual || 1}</Text>
            <Text style={styles.titulo}>{receita.nome}</Text>
            <Text style={styles.empresa}>{receita.empresa}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <Image src="/logo-monograma.png" style={styles.logoPequeno} />
            {receita.papel ? <Text style={styles.badge}>{LABEL_TIPO_RECEITA[receita.papel] || receita.papel}</Text> : null}
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Ingredientes</Text>
        <View style={styles.tabelaHeader}>
          <Text style={[styles.tabelaHeaderCel, celNome]}>Ingrediente</Text>
          <Text style={[styles.tabelaHeaderCel, celApres]}>Apres.</Text>
          <Text style={[styles.tabelaHeaderCel, celObs]}>Obs.</Text>
          <Text style={[styles.tabelaHeaderCel, celQtde]}>Qtde</Text>
          <Text style={[styles.tabelaHeaderCel, celUnid]}>Unid.</Text>
          {mostrarCustos && <Text style={[styles.tabelaHeaderCel, styles.celValorUnit]}>Vlr. unit.</Text>}
          {mostrarCustos && <Text style={[styles.tabelaHeaderCel, styles.celValor]}>Valor</Text>}
        </View>
        {itens.map((linha, i) => (
          <View style={styles.tabelaLinha} key={i}>
            <Text style={celNome}>{linha.nome}</Text>
            <Text style={celApres}>{linha.apresentacao || "—"}</Text>
            <Text style={celObs}>{linha.observacao || "—"}</Text>
            <Text style={celQtde}>{formatNumber(linha.quantidade, 3)}</Text>
            <Text style={celUnid}>{linha.unidade}</Text>
            {mostrarCustos && <Text style={styles.celValorUnit}>{formatBRL(linha.valorUnitario)}/{linha.unidadePreco}</Text>}
            {mostrarCustos && <Text style={styles.celValor}>{formatBRL(linha.valorTotal)}</Text>}
          </View>
        ))}

        {mostrarCustos && (
          <>
            <View style={styles.totaisRow}>
              <View style={styles.totalBloco}>
                <Text style={styles.totalLabel}>Ingredientes</Text>
                <Text style={styles.totalValor}>{formatBRL(cmv.custoIngredientes)}</Text>
              </View>
              <View style={styles.totalBloco}>
                <Text style={styles.totalLabel}>Embalagem</Text>
                <Text style={styles.totalValor}>{formatBRL(cmv.custoEmbalagem)}</Text>
              </View>
              <View style={styles.totalBloco}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValor}>{formatBRL(cmv.custoTotal)}</Text>
              </View>
            </View>

            <View style={styles.cmvDestaque}>
              <Text style={styles.cmvLabel}>CMV unitário (produção prevista: {formatNumber(quantidadeProducao, 0)} un)</Text>
              <Text style={styles.cmvValor}>{formatBRL(cmv.cmvUnitario)}</Text>
            </View>
          </>
        )}

        {receita.modo_preparo ? (
          <>
            <Text style={styles.secaoTitulo}>Modo de preparo</Text>
            <Text style={styles.preparoTexto}>{receita.modo_preparo}</Text>
          </>
        ) : null}

        {(receita.produtos || []).length > 0 ? (
          <>
            <Text style={styles.secaoTitulo}>Produtos / Informação nutricional</Text>
            {receita.produtos.map((produto) => (
              <View key={produto.id} style={styles.produtoBox} wrap={false}>
                <View style={styles.produtoHeaderRow}>
                  <View>
                    <Text style={styles.produtoCodigo}>{produto.codigo}</Text>
                    <Text style={styles.produtoNome}>{produto.nome_produto}</Text>
                  </View>
                  {produto.tipo_embalagem ? <Text style={styles.produtoTipoBadge}>{produto.tipo_embalagem}</Text> : null}
                </View>

                <View style={styles.camposGrid}>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>Código de barras</Text>
                    <Text style={styles.campoValor}>{produto.codigo_barras || "—"}</Text>
                  </View>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>NCM</Text>
                    <Text style={styles.campoValor}>{produto.ncm || "—"}</Text>
                  </View>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>CEST</Text>
                    <Text style={styles.campoValor}>{produto.cest || "—"}</Text>
                  </View>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>Departamento</Text>
                    <Text style={styles.campoValor}>{produto.departamento || "—"}</Text>
                  </View>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>Seção</Text>
                    <Text style={styles.campoValor}>{produto.secao || "—"}</Text>
                  </View>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>Categoria</Text>
                    <Text style={styles.campoValor}>{produto.categoria || "—"}</Text>
                  </View>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>Peso líquido</Text>
                    <Text style={styles.campoValor}>{produto.peso_liquido ? `${formatNumber(produto.peso_liquido, 3)} kg` : "—"}</Text>
                  </View>
                  <View style={styles.campoBloco}>
                    <Text style={styles.campoLabel}>Validade</Text>
                    <Text style={styles.campoValor}>{produto.validade_dias ? `${produto.validade_dias} dias` : "—"}</Text>
                  </View>
                </View>

                {produto.info_nutricional ? (
                  <>
                    {produto.info_nutricional.apelido ? (
                      <Text style={styles.apelidoTexto}>Apelido: {produto.info_nutricional.apelido}</Text>
                    ) : null}
                    {mostrarCustos && parseFloat(produto.info_nutricional.medida_caseira) > 0 ? (
                      <Text style={styles.custoPacoteTexto}>
                        Qtde. PCT: {parseFloat(produto.info_nutricional.medida_caseira)} · Custo do pacote (CMV unit. × Qtde. PCT): {formatBRL(cmv.cmvUnitario * parseFloat(produto.info_nutricional.medida_caseira))}
                      </Text>
                    ) : null}
                    {produto.info_nutricional.ingredientes_texto ? (
                      <Text style={styles.ingredientesTexto}>{produto.info_nutricional.ingredientes_texto}</Text>
                    ) : null}
                    {produto.info_nutricional.alergicos_texto ? (
                      <Text style={styles.alergicosTexto}>{produto.info_nutricional.alergicos_texto}</Text>
                    ) : null}
                  </>
                ) : null}

                {(produto.tabela_nutricional || []).length > 0 ? (
                  <>
                    <Text style={styles.nutriTitulo}>Tabela nutricional</Text>
                    <View style={styles.nutriHeader}>
                      <Text style={[styles.nutriHeaderCel, styles.nutriNome]}>Nutriente</Text>
                      <Text style={[styles.nutriHeaderCel, styles.nutriQtd]}>Qtd. comp.</Text>
                      <Text style={[styles.nutriHeaderCel, styles.nutriPorcao]}>Porção</Text>
                      <Text style={[styles.nutriHeaderCel, styles.nutriVd]}>%VD</Text>
                    </View>
                    {produto.tabela_nutricional.map((n, i) => (
                      <View style={styles.nutriLinha} key={i}>
                        <Text style={styles.nutriNome}>{n.nutriente}</Text>
                        <Text style={styles.nutriQtd}>{n.qtd_comparativa}</Text>
                        <Text style={styles.nutriPorcao}>{n.porcao}</Text>
                        <Text style={styles.nutriVd}>{n.vd_percentual || "-"}</Text>
                      </View>
                    ))}

                    {(() => {
                      const alertasRotulagem = calcularAlertasRotulagem(produto.tabela_nutricional);
                      if (alertasRotulagem.length === 0) return null;
                      return (
                        <>
                          <Text style={styles.alertasTitulo}>Rotulagem frontal obrigatória</Text>
                          <View style={styles.alertasRow}>
                            {alertasRotulagem.map((a) => (
                              <View style={styles.lupaBox} key={a.tipo}>
                                <LupaRotulagemPDF linhas={a.linhas} />
                              </View>
                            ))}
                          </View>
                          <Text style={styles.alertasRodape}>
                            Calculado por 100g conforme RDC 429/2020 — confira a arte final do selo antes de imprimir a embalagem.
                          </Text>
                        </>
                      );
                    })()}
                  </>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.rodape} fixed>
          <View>
            <Text>Mamma Formula — Ficha de Produção</Text>
            <Text style={{ marginTop: 2 }}>Elaborado por Thalita C. Oliveira - Qualidade</Text>
          </View>
          <Text>Gerado em {geradoEm}</Text>
        </View>
      </Page>
    </Document>
  );
}
