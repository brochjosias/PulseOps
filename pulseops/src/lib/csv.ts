import Papa from 'papaparse';

export function exportToCsv<T extends object>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[],
) {
  if (data.length === 0) {
    throw new Error('Não há dados para exportar.');
  }

  // Se colunas customizadas forem passadas, mapeia para os labels
  let exportData = data;
  if (columns) {
    exportData = data.map((item) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col) => {
        row[col.label] = item[col.key];
      });
      return row as T;
    });
  }

  const csv = Papa.unparse(exportData, {
    delimiter: ';', // Padrão brasileiro (Excel pt-BR abre com ;)
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // \uFEFF é o BOM para o Excel reconhecer acentos
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
