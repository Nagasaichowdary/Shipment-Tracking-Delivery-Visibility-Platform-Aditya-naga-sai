function DashboardCard({ title, count }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow">

      <h3 className="text-gray-500">
        {title}
      </h3>

      <h1 className="text-4xl font-bold mt-3">
        {count}
      </h1>

    </div>
  );
}

export default DashboardCard;