// Tipos de receita (campo "papel" salvo no backend) — usado nos cards de
// seleção em Receitas e no filtro/badge da tela de CMV.
import { Wheat, Snowflake, Flame, PackageCheck, Shapes } from "lucide-react";

export const TIPOS_RECEITA = [
  { value: "massa", label: "Massa", icone: Wheat },
  { value: "recheio_frio", label: "Recheio Frio", icone: Snowflake },
  { value: "recheio_quente", label: "Recheio Quente", icone: Flame },
  { value: "produto_final", label: "Produto Final", icone: PackageCheck },
  { value: "outro", label: "Outro", icone: Shapes },
];

// Inclui o valor legado "recheio" (de receitas classificadas antes da
// separação Frio/Quente) só para exibir o rótulo corretamente onde já
// existir esse dado salvo — não aparece como card de seleção.
export const LABEL_TIPO_RECEITA = {
  recheio: "Recheio",
  ...Object.fromEntries(TIPOS_RECEITA.map((t) => [t.value, t.label])),
};
