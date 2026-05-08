import pt from '../../messages/pt.json';
import en from '../../messages/en.json';
import jp from '../../messages/jp.json';

describe('i18n integrity', () => {
  const getKeys = (obj: any, prefix = ''): string[] => {
    return Object.keys(obj).reduce((res: string[], el: string) => {
      if (typeof obj[el] === 'object' && obj[el] !== null && !Array.isArray(obj[el])) {
        return [...res, ...getKeys(obj[el], prefix + el + '.')];
      }
      return [...res, prefix + el];
    }, []);
  };

  const ptKeys = getKeys(pt).sort();
  const enKeys = getKeys(en).sort();
  const jpKeys = getKeys(jp).sort();

  test('English should have the same keys as Portuguese', () => {
    expect(enKeys).toEqual(ptKeys);
  });

  test('Japanese should have the same keys as Portuguese', () => {
    expect(jpKeys).toEqual(ptKeys);
  });
});
