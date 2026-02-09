export default function TradeTable({ trades }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Action</th>
          <th>Price</th>
          <th>Quantity</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t, i) => (
          <tr key={i}>
            <td>{new Date(t.time).toLocaleString()}</td>
            <td>{t.action}</td>
            <td>{t.price}</td>
            <td>{t.quantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
