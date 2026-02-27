export const filterAndEnsureValidKeys = <T extends { id: string | number }>(items: T[]): T[] => {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items.filter(item => {
    if (!item || typeof item.id === 'object' || item.id === null || item.id === undefined) {
      console.warn('Invalid item removed from list:', item);
      return false;
    }
    const key = String(item.id);
    if (seen.has(key)) {
      console.warn('Duplicate key found and removed:', key);
      return false;
    }
    seen.add(key);
    return true;
  });
};
