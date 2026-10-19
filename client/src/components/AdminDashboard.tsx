import type { AdminInsights, Category } from "../types";
import Empty from "./Empty";

type CategoryForm = { name: string; description: string };

type AdminDashboardProps = {
  data: AdminInsights | null;
  categories: Category[];
  editingCategory: Category | null;
  categoryForm: CategoryForm;
  money: (amount: number) => string;
  onSaveCategory: (event: React.FormEvent<HTMLFormElement>) => void;
  onDeleteCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onCancelEdit: () => void;
  onCategoryFormChange: (form: CategoryForm) => void;
};

export default function AdminDashboard({
  data,
  categories,
  editingCategory,
  categoryForm,
  money,
  onSaveCategory,
  onDeleteCategory,
  onEditCategory,
  onCancelEdit,
  onCategoryFormChange,
}: AdminDashboardProps) {
  return (
    <>
      <section className="content-grid admin-insights-grid">
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">PLATFORM</p><h2>Spending by category</h2></div></div>
          {data?.spendingByCategory.length ? data.spendingByCategory.map((item) => (
            <div className="category-row" key={item.category}><div className="category-details"><div className="category-label"><strong>{item.category}</strong><span>{item.usageCount} expenses · {money(item.totalSpent)}</span></div></div></div>
          )) : <Empty message="No category spending to show yet." />}
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">MOST USED</p><h2>Top categories</h2></div></div>
          {data?.topFiveCategories.map((item, index) => (
            <div className="category-row" key={item.category}><div className="category-details"><div className="category-label"><strong>{index + 1}. {item.category}</strong><span>{item.usageCount}</span></div></div></div>
          ))}
          <div className="panel-heading admin-subheading"><div><p className="eyebrow">LEAST USED</p><h2>Bottom categories</h2></div></div>
          {data?.bottomFiveCategories.map((item) => (
            <div className="category-row" key={item.category}><div className="category-details"><div className="category-label"><strong>{item.category}</strong><span>{item.usageCount}</span></div></div></div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">CATEGORY SETUP</p><h2>{editingCategory ? "Edit category" : "Add a category"}</h2></div></div>
        <form className="category-form" onSubmit={onSaveCategory}>
          <label>Name<input required value={categoryForm.name} onChange={(event) => onCategoryFormChange({ ...categoryForm, name: event.target.value })} /></label>
          <label>Description<input value={categoryForm.description} onChange={(event) => onCategoryFormChange({ ...categoryForm, description: event.target.value })} /></label>
          <div className="form-actions">
            {editingCategory && <button type="button" className="secondary-btn" onClick={onCancelEdit}>Cancel edit</button>}
            <button className="primary-btn">{editingCategory ? "Save category" : "Add category"}</button>
          </div>
        </form>
        {categories.map((category) => (
          <div className="category-row admin-category-row" key={category._id}>
            <div className="category-details"><div className="category-label"><strong>{category.name}</strong><span>{category.description || "No description"}</span></div></div>
            <button className="table-action" onClick={() => onEditCategory(category)}>Edit</button>
            <button className="table-action danger-action" onClick={() => onDeleteCategory(category)} title={`Delete ${category.name}`}>×</button>
          </div>
        ))}
      </section>
      <section className="content-grid admin-insights-grid">
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Recently added expenses</h2></div></div>
          {data?.recentExpenses.length ? <div className="table-wrap"><table><thead><tr><th>EXPENSE</th><th>USER</th><th>CATEGORY</th><th>AMOUNT</th></tr></thead><tbody>{data.recentExpenses.map((item) => <tr key={item._id}><td>{item.title}</td><td>{item.user?.name || "Unknown"}</td><td>{item.category}</td><td>{money(item.amount)}</td></tr>)}</tbody></table></div> : <Empty message="No expenses recorded yet." />}
        </div>
        <div className="panel">
          <div className="panel-heading"><div><p className="eyebrow">NEW ACCOUNTS</p><h2>Recently registered users</h2></div></div>
          {data?.recentUsers.length ? <div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th></tr></thead><tbody>{data.recentUsers.map((item) => <tr key={item.id || item._id}><td>{item.name}</td><td>{item.email}</td><td>{item.role}</td></tr>)}</tbody></table></div> : <Empty message="No users registered yet." />}
        </div>
      </section>
      {!data && <Empty message="Loading platform insights…" />}
    </>
  );
}
