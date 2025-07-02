"use client";

export default function CategorySidebar({
  categories = ["Kids", "Men", "Women", "Bags"],
  selectedCategory,
  setSelectedCategory,
}) {
  return (
    <div className="w-full md:w-64 bg-gray-100 p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-4">Categories</h2>
      <ul className="space-y-2">
        <li>
          <button
            onClick={() => setSelectedCategory("")}
            className={`w-full text-left p-2 rounded ${
              selectedCategory === "" ? "bg-blue-600 text-white" : "hover:bg-gray-200"
            }`}
            aria-label="All categories"
          >
            All
          </button>
        </li>
        {categories.map((category) => (
          <li key={category}>
            <button
              onClick={() => setSelectedCategory(category)}
              className={`w-full text-left p-2 rounded ${
                selectedCategory === category ? "bg-blue-600 text-white" : "hover:bg-gray-200"
              }`}
              aria-label={`Select ${category}`}
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}