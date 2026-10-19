import { useDispatch } from "react-redux";
import {
  setCategory,
  setEndDate,
  setPaymentMethod,
  setSearch,
  setSort,
  setStartDate,
} from "../store";

type ExpenseFiltersProps = {
  search: string;
  category: string;
  categories: string[];
  paymentMethod: string;
  startDate: string;
  endDate: string;
  sort: string;
};

export default function ExpenseFilters({
  search,
  category,
  categories,
  paymentMethod,
  startDate,
  endDate,
  sort,
}: ExpenseFiltersProps) {
  const dispatch = useDispatch();

  return (
    <div className="filters">
      <input className="filter-search" aria-label="Search expenses" placeholder="Search expenses..." value={search} onChange={(event) => dispatch(setSearch(event.target.value))} />
      <select aria-label="Filter category" value={category} onChange={(event) => dispatch(setCategory(event.target.value))}>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="Filter payment method" value={paymentMethod} onChange={(event) => dispatch(setPaymentMethod(event.target.value))}>
        {["All", "Cash", "Card", "Mobile Money", "Bank Transfer", "Other"].map((method) => <option key={method}>{method}</option>)}
      </select>
      <input type="date" aria-label="Start date" value={startDate} onChange={(event) => dispatch(setStartDate(event.target.value))} />
      <input type="date" aria-label="End date" value={endDate} min={startDate || undefined} onChange={(event) => dispatch(setEndDate(event.target.value))} />
      <select aria-label="Sort expenses" value={sort} onChange={(event) => dispatch(setSort(event.target.value))}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="amount-high">Highest amount</option>
        <option value="amount-low">Lowest amount</option>
      </select>
    </div>
  );
}
