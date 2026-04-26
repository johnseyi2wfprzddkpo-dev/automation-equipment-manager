export default function SearchBar({ value, onChange, placeholder = "搜索" }) {
  return (
    <input
      className="search-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type="search"
    />
  );
}

