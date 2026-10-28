// 客戶的兩種標籤：狀態（新客戶／追蹤中／已成交）＋ 溫度（熱／溫／冷）
import { View } from 'react-native';
import Tag from './Tag';

export const statusLabel = { new: '新客戶', following: '追蹤中', won: '已成交' };
const statusTone = { new: 'purple', following: 'warm', won: 'green' };
export const tempLabel = { hot: '熱', warm: '溫', cold: '冷' };

export default function CustomerTags({ customer, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {customer.status ? <Tag label={statusLabel[customer.status]} tone={statusTone[customer.status]} /> : null}
      <Tag label={tempLabel[customer.temperature]} tone={customer.temperature} style={{ marginLeft: 4 }} />
    </View>
  );
}
