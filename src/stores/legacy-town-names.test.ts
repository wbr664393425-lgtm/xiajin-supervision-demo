import { expect, it } from 'vitest'
import { towns } from '@/mock/geo'
import { replaceLegacyTownNames } from './legacy-town-names'

it('converts all former town names in saved keys and text without losing record links or notes', () => {
  const former = ['银城街道', '北城街道', '南城镇', '新盛店镇', '苏留庄镇', '雷集镇', '东李官屯镇',
    '香赵庄镇', '宋楼镇', '双庙镇', '郑保屯镇', '白马湖镇', '渡口驿乡', '田庄乡']
  const records = (names: string[]) => Object.fromEntries(names.map((name, i) => [
    `部门-${name}纪委`, { town: towns[i]!.id, text: `核对${name}乡镇台账，保留人工备注`, status: '已完成' },
  ]))
  const expected = records(towns.map(t => t.name))
  const migrated = replaceLegacyTownNames(JSON.stringify(records(former)))
  expect(JSON.parse(migrated)).toEqual(expected)
  expect(replaceLegacyTownNames(migrated)).toBe(migrated)
})
