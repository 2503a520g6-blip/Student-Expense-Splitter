# 🎓 Student Expense Splitter (SplitMate)

A modern, responsive, and beginner-friendly web application designed for college roommates, hostel groups, campus clubs, and student project teams to split shared expenses fairly, visualize spending trends, and settle debts with ease.

Built with **HTML5**, **CSS3**, **Vanilla JavaScript**, and **Chart.js** — requires **no backend**, **no database**, and works with complete **offline support**.

---

## 🌟 Upgraded Features & Capabilities

1. **Fintech-Grade Dashboard**:
   - Modern, attractive **Blue & White** student-friendly interface.
   - Summary cards displaying **Total Group Spending**, **Number of Students**, **Number of Expenses**, and **Pending Settlements**.
   - Default currency set to **Indian Rupees (₹)**, with one-click switching to USD ($), EUR (€), GBP (£), CAD (C$), and AUD (A$).

2. **Visual Spending Analytics (Chart.js)**:
   - **Monthly Spending Trend**: Interactive bar chart displaying group expenditure over time.
   - **Category-wise Breakdown**: Interactive doughnut chart visualizing spending distribution across Food 🍕, Groceries 🛒, Rent 🏠, Utilities 💡, Travel 🚗, Entertainment 🎬, and Study 📚.

3. **Complete Member Management (Add, Edit, Remove)**:
   - Add students with duplicate and empty-name validation.
   - **Edit / Rename**: Click the ✏️ icon on any student chip to rename them. The system automatically updates all past expenses, splits, and settlement logs safely.
   - **Remove**: Safe deletion with confirmation modal and balance recalculation.

4. **Separate Bill Tracking & Individual Bill Editing**:
   - Every bill is assigned a unique ID (e.g. `#BILL-1001`).
   - Multiple expenses paid by the same student (such as ₹6,000 for rent and ₹500 for electricity) are always tracked and displayed as completely distinct, separate bills.
   - Edit individual bills directly (change description, amount, payer, or split) via the ✏️ Edit Bill modal without affecting any other bills.
   - In Member Balances, each student's card shows their total paid alongside a pill list of each individual bill they paid.

5. **Equal Split & Custom Amount Splitting**:
   - **Equal Split (=)**: Automatically divides total amount among selected members with a live per-person estimate banner.
   - **Custom Amounts (✍️)**: Enter exact individual shares for each student with an allocation meter (`Allocated: ₹X / Total: ₹Y`) and validation warning if shares don't match the total.

5. **Smart Settlement Engine with 1-Click "Mark as Paid"**:
   - Greedy debtor-to-creditor matching algorithm minimizes transactions into direct transfers (e.g. *"Jordan pays Priya ₹416.67"*).
   - **✓ Mark Paid**: One-click settlement button that logs the payment, re-balances group debts to zero, and records it in the **Completed Settlements** history with an **Undo** option.
   - **Copy Plan**: 1-click clipboard copy to share the settlement plan directly into WhatsApp or Telegram groups.

6. **Monthly Expense Reports & CSV Download**:
   - **Monthly Report Banner**: Select any month to see that month's total spending and top expenditure category.
   - **Export to CSV**: Generates an Excel-ready `.csv` file with UTF-8 BOM encoding so Indian Rupee symbols (₹) and amounts display cleanly without character corruption.

7. **Data Persistence & Local Storage**:
   - All members, expenses, settled payments, and currency settings are stored in the browser's `localStorage` and persist across page reloads.

---

## 🚀 How to Run the Application in VS Code

### Method 1: Using the VS Code Live Server Extension (Recommended)
1. Open **Visual Studio Code**.
2. Press `Ctrl + K, Ctrl + O` (or **File** > **Open Folder...**).
3. Select this folder:
   ```
   C:\Users\srivi\.gemini\antigravity\scratch\student-expense-splitter
   ```
4. Right-click on `index.html` in the sidebar and choose **"Open with Live Server"** (or click **"Go Live"** on the bottom status bar).
5. The dashboard will automatically open in your browser at `http://127.0.0.1:5500/index.html`.

### Method 2: Direct Browser Launch
- Double-click `index.html` in Windows Explorer or open it in Microsoft Edge / Google Chrome:
  ```
  file:///C:/Users/srivi/.gemini/antigravity/scratch/student-expense-splitter/index.html
  ```

---

## 📁 File Structure & Responsibilities

```
student-expense-splitter/
├── index.html     # Semantic structure, dashboard cards, modal dialogs, and Chart.js canvases
├── style.css      # Blue & white responsive styling, custom inputs, charts, and animations
├── script.js     # State management, Chart.js integrations, equal/custom splitting, settlement engine
└── README.md      # Documentation, user guide, and testing instructions
```

### 1. `index.html`
- **Header**: Currency dropdown (default ₹), "Demo Data", and "Reset All" controls.
- **Hero & Stat Cards**: Real-time spending, member, expense, and settlement counters.
- **Card 1 (Group Members)**: Member input form, dynamic chips with avatar initials, edit ✏️, and remove ✕ buttons.
- **Card 2 (Add Expense)**: Supports title, amount, category, payer, date, and segmented split toggle (Equal vs. Custom Amounts).
- **Card 3 (Spending Analytics)**: Holds the canvas elements for the Monthly Trend Bar Chart and Category Doughnut Chart.
- **Card 4 (Member Balances)**: Net balance badges (`+Gets Back`, `-Owes Money`, `Settled Up`).
- **Card 5 (Settlement & Clear Dues)**: Smart settlement cards with `✓ Mark Paid` buttons and completed settlement history list.
- **Card 6 (Expense History & Reports)**: Search box, month dropdown filter, category filter, monthly report summary banner, and `Export CSV` button.

### 2. `style.css`
- **Color Theme**: Royal blue (`#2563eb`), deep navy (`#1e3a8a`), clean white cards, soft slate background (`#f8fafc`).
- **Responsive Layout**: CSS Grid adapts between 2 columns on desktop and 1 column on tablets and smartphones.
- **Form & Chip Polish**: Custom toggle buttons, allocation meter (`.matched` / `.unmatched`), custom amount inputs, and floating toast alerts.

### 3. `script.js`
- **State**: Manages `members`, `expenses`, `settledPayments`, `currentCurrency`, and `currentSplitMode`.
- **Chart.js Integration**: Creates, updates, and destroys `monthlyChartInstance` and `categoryChartInstance` without memory leaks.
- **Split Modes**: Computes equal per-person shares or validates custom input allocations within 0.05 tolerance.
- **Mark Paid Settlement**: Adds an offsetting settlement transaction so debtor and creditor balances balance out mathematically.
- **CSV Generator**: Formats and exports data with UTF-8 BOM (`\uFEFF`) for Microsoft Excel compatibility.
