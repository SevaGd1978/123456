from sqlalchemy.orm import Session
from models import FamilyMember, Account, Category, Transaction, Budget, Goal

def apply_transaction_to_balance(db: Session, trans: Transaction, revert: bool = False):
    factor = -1 if revert else 1
    
    if trans.trans_type == "expense":
        acc = db.query(Account).filter(Account.id == trans.account_id).first()
        if acc:
            acc.current_balance -= factor * trans.amount
    elif trans.trans_type == "income":
        acc = db.query(Account).filter(Account.id == trans.account_id).first()
        if acc:
            acc.current_balance += factor * trans.amount
    elif trans.trans_type == "transfer":
        from_acc = db.query(Account).filter(Account.id == trans.account_id).first()
        to_acc = db.query(Account).filter(Account.id == trans.to_account_id).first()
        if from_acc:
            from_acc.current_balance -= factor * trans.amount
        if to_acc:
            to_acc.current_balance += factor * trans.amount

def init_default_data(db: Session):
    # Only seed if no categories exist
    if db.query(Category).count() > 0:
        return

    # 1. Члены семьи
    members = [
        FamilyMember(name="Алексей", role="Отец", avatar_color="#3b82f6"),
        FamilyMember(name="Елена", role="Мать", avatar_color="#ec4899"),
        FamilyMember(name="Максим", role="Сын (14 лет)", avatar_color="#10b981"),
    ]
    db.add_all(members)
    db.commit()

    # 2. Счета
    accounts = [
        Account(name="Зарплатная карта (Тинькофф)", account_type="Дебетовая карта", currency="RUB", initial_balance=120000.0, current_balance=120000.0, color="#f59e0b"),
        Account(name="Семейная карта (Сбер)", account_type="Дебетовая карта", currency="RUB", initial_balance=45000.0, current_balance=45000.0, color="#10b981"),
        Account(name="Накопительный счет (Фонд безопасности)", account_type="Накопительный счет", currency="RUB", initial_balance=350000.0, current_balance=350000.0, color="#3b82f6"),
        Account(name="Наличные в копилке", account_type="Наличные", currency="RUB", initial_balance=15000.0, current_balance=15000.0, color="#8b5cf6"),
    ]
    db.add_all(accounts)
    db.commit()

    # 3. Категории расходов
    expense_categories = [
        Category(name="Продукты питания", cat_type="expense", icon="shopping-cart", color="#ef4444"),
        Category(name="Кафе и рестораны", cat_type="expense", icon="utensils", color="#f97316"),
        Category(name="Коммунальные услуги и ЖКУ", cat_type="expense", icon="home", color="#06b6d4"),
        Category(name="Транспорт и бензин", cat_type="expense", icon="car", color="#6366f1"),
        Category(name="Образование и кружки", cat_type="expense", icon="book-open", color="#8b5cf6"),
        Category(name="Здоровье и аптеки", cat_type="expense", icon="heart-pulse", color="#ec4899"),
        Category(name="Одежда и обувь", cat_type="expense", icon="shirt", color="#14b8a6"),
        Category(name="Развлечения и отдых", cat_type="expense", icon="film", color="#f43f5e"),
        Category(name="Техника и дом", cat_type="expense", icon="tv", color="#64748b"),
    ]

    # Категории доходов
    income_categories = [
        Category(name="Заработная плата", cat_type="income", icon="briefcase", color="#10b981"),
        Category(name="Премия и бонусы", cat_type="income", icon="award", color="#059669"),
        Category(name="Пассивный доход и % по вкладам", cat_type="income", icon="trending-up", color="#3b82f6"),
        Category(name="Подарки", cat_type="income", icon="gift", color="#8b5cf6"),
    ]

    db.add_all(expense_categories + income_categories)
    db.commit()

    # 4. Цели
    m1 = members[0]
    m2 = members[1]
    goals = [
        Goal(title="Семейный отпуск на море", target_amount=200000.0, current_amount=135000.0, target_date="2026-11-01", member_id=m1.id, color="#0ea5e9"),
        Goal(title="Покупка нового ноутбука для учебы", target_amount=90000.0, current_amount=60000.0, target_date="2026-10-15", member_id=m2.id, color="#8b5cf6"),
        Goal(title="Резервный фонд (подушка безопасности)", target_amount=500000.0, current_amount=350000.0, target_date="2026-12-31", member_id=None, color="#10b981"),
    ]
    db.add_all(goals)
    db.commit()

    # 5. Бюджеты на текущий месяц (например, 2026-09)
    cat_food = next(c for c in expense_categories if c.name == "Продукты питания")
    cat_cafe = next(c for c in expense_categories if c.name == "Кафе и рестораны")
    cat_util = next(c for c in expense_categories if c.name == "Коммунальные услуги и ЖКУ")
    cat_trans = next(c for c in expense_categories if c.name == "Транспорт и бензин")
    cat_edu = next(c for c in expense_categories if c.name == "Образование и кружки")

    current_month = "2026-09"
    budgets = [
        Budget(category_id=cat_food.id, month=current_month, limit_amount=40000.0),
        Budget(category_id=cat_cafe.id, month=current_month, limit_amount=15000.0),
        Budget(category_id=cat_util.id, month=current_month, limit_amount=12000.0),
        Budget(category_id=cat_trans.id, month=current_month, limit_amount=15000.0),
        Budget(category_id=cat_edu.id, month=current_month, limit_amount=20000.0),
    ]
    db.add_all(budgets)
    db.commit()

    # 6. Начальные операции за август и сентябрь 2026
    acc_tinkoff = accounts[0]
    acc_sber = accounts[1]
    cat_salary = next(c for c in income_categories if c.name == "Заработная плата")
    cat_bonus = next(c for c in income_categories if c.name == "Премия и бонусы")

    sample_txs = [
        Transaction(trans_type="income", amount=130000.0, date="2026-09-01", account_id=acc_tinkoff.id, category_id=cat_salary.id, member_id=members[0].id, description="Зарплата Алексея за август"),
        Transaction(trans_type="income", amount=85000.0, date="2026-09-02", account_id=acc_sber.id, category_id=cat_salary.id, member_id=members[1].id, description="Зарплата Елены"),
        Transaction(trans_type="expense", amount=4800.0, date="2026-09-02", account_id=acc_sber.id, category_id=cat_food.id, member_id=members[1].id, description="Закупка в гипермаркете на неделю"),
        Transaction(trans_type="expense", amount=2300.0, date="2026-09-03", account_id=acc_tinkoff.id, category_id=cat_trans.id, member_id=members[0].id, description="Полный бак бензина АИ-95"),
        Transaction(trans_type="expense", amount=1450.0, date="2026-09-03", account_id=acc_tinkoff.id, category_id=cat_cafe.id, member_id=members[0].id, description="Семейный обед в кафе"),
        Transaction(trans_type="expense", amount=6500.0, date="2026-09-01", account_id=acc_sber.id, category_id=cat_edu.id, member_id=members[2].id, description="Курсы английского языка для Максима"),
        Transaction(trans_type="transfer", amount=20000.0, date="2026-09-02", account_id=acc_tinkoff.id, to_account_id=accounts[2].id, member_id=members[0].id, description="Пополнение подушки безопасности"),
    ]
    for tx in sample_txs:
        db.add(tx)
        apply_transaction_to_balance(db, tx)
    db.commit()
