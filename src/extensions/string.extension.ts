declare global {
  interface String {
    toCamelCase(): string
    toSpinalCase(): string
  }
}

String.prototype.toCamelCase = function (): string {
  return this.replace(/(?:^\w|[A-Z]|-|\b\w)/g, (ltr, idx) =>
    idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()
  ).replace(/\s+|-/g, '')
}

/**
 * @example spinalCase("AllThe-small Things") should return "all-the-small-things"
 */
String.prototype.toSpinalCase = function (): string {
  return this.split(/\s|_|(?=[A-Z])/)
    .join('-')
    .toLowerCase()
}

export {}
