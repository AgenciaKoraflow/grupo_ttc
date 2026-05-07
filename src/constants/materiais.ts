export const UNIT_OPTIONS = [
  { value: 'metro',      label: 'Metro' },
  { value: 'centimetro', label: 'Centímetro' },
  { value: 'milimetro',  label: 'Milímetro' },
  { value: 'kg',         label: 'Quilograma (kg)' },
  { value: 'grama',      label: 'Grama' },
  { value: 'tonelada',   label: 'Tonelada' },
  { value: 'unidade',    label: 'Unidade' },
  { value: 'bobina',     label: 'Bobina' },
  { value: 'caixa',      label: 'Caixa' },
  { value: 'pacote',     label: 'Pacote' },
  { value: 'rolo',       label: 'Rolo' },
  { value: 'barra',      label: 'Barra' },
  { value: 'peca',       label: 'Peça' },
  { value: 'par',        label: 'Par' },
  { value: 'kit',        label: 'Kit' },
  { value: 'saco',       label: 'Saco' },
  { value: 'galao',      label: 'Galão' },
  { value: 'tubo',       label: 'Tubo' },
] as const;

export type UnitValue = (typeof UNIT_OPTIONS)[number]['value'];
