export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Separa os acentos das letras (ex: 'é' -> 'e' + '´')
    .replace(/[̀-ͯ]/g, '') // Remove os acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-'); // Remove múltiplos hífens
}
