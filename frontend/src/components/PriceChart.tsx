import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  price: number;
  retailer: string;
}

interface Props {
  data: DataPoint[];
}

export function PriceChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No price history available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-white rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => typeof value === 'number' ? `$${value.toFixed(2)}` : value} />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#10b981"
            dot={false}
            name="Price"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
