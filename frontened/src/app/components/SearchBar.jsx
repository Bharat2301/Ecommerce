import { Search } from "lucide-react";

export default function SearchBar({ searchQuery, setSearchQuery }) {
  return (
    <div className="flex items-center border rounded p-2">
      <Search className="mr-2" />
      <input
        type="text"
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full outline-none"
      />
    </div>
  );
}