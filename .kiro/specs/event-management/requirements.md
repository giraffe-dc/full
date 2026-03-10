# Requirements Document

## Introduction

Система управління івентами для розважального центру "Жирафик" призначена для автоматизації процесів планування, організації та проведення різноманітних заходів (дитячі свята, майстер-класи, тематичні заходи). Система забезпечує повний цикл управління івентами від створення до звітності, інтегруючись з існуючими модулями персоналу та бухгалтерії.

## Glossary

- **Event_Management_System**: Система управління івентами розважального центру "Жирафик"
- **Event**: Захід, що проводиться в розважальному центрі (дитяче свято, майстер-клас, тематичний захід)
- **Event_Type**: Тип заходу з визначеними характеристиками (наприклад, "День народження", "Майстер-клас", "Тематична вечірка")
- **Event_Template**: Шаблон заходу з попередньо налаштованими параметрами
- **Resource**: Ресурс, необхідний для проведення заходу (зала, аніматор, обладнання)
- **Booking**: Бронювання ресурсу на конкретний час
- **Participant**: Учасник заходу
- **Registration**: Реєстрація учасника на захід
- **Staff_Member**: Співробітник центру (аніматор, ведучий, технічний персонал)
- **Calendar**: Календар заходів з візуалізацією
- **Notification**: Повідомлення або нагадування про захід
- **Event_Report**: Звіт по заходу (відвідуваність, прибутковість)
- **Pricing**: Ціноутворення для заходу
- **Payment**: Оплата за участь у заході

## Requirements

### Requirement 1: Створення та управління івентами

**User Story:** Як адміністратор центру, я хочу створювати та редагувати заходи, щоб планувати роботу розважального центру

#### Acceptance Criteria

1. THE Event_Management_System SHALL створювати Event з обов'язковими полями: назва, тип, дата початку, дата закінчення, опис
2. THE Event_Management_System SHALL зберігати Event в MongoDB з унікальним ідентифікатором
3. WHEN Event створюється, THE Event_Management_System SHALL валідувати, що дата закінчення пізніше або дорівнює даті початку
4. THE Event_Management_System SHALL дозволяти редагування всіх полів Event до моменту його початку
5. WHEN Event редагується, THE Event_Management_System SHALL зберігати історію змін з міткою часу та користувачем
6. THE Event_Management_System SHALL дозволяти видалення Event тільки якщо немає підтверджених реєстрацій
7. THE Event_Management_System SHALL підтримувати статуси Event: "Чернетка", "Заплановано", "В процесі", "Завершено", "Скасовано"

### Requirement 2: Управління типами івентів та шаблонами

**User Story:** Як адміністратор центру, я хочу створювати типи заходів та шаблони, щоб швидко планувати типові заходи

#### Acceptance Criteria

1. THE Event_Management_System SHALL створювати Event_Type з полями: назва, опис, типова тривалість, типова кількість учасників
2. THE Event_Management_System SHALL створювати Event_Template на основі Event_Type з попередньо налаштованими ресурсами, персоналом та ціноутворенням
3. WHEN Event створюється з Event_Template, THE Event_Management_System SHALL автоматично заповнювати всі поля з шаблону
4. THE Event_Management_System SHALL дозволяти модифікацію Event після створення з шаблону без впливу на сам шаблон
5. THE Event_Management_System SHALL зберігати список доступних Event_Type та Event_Template в MongoDB

### Requirement 3: Бронювання ресурсів

**User Story:** Як адміністратор центру, я хочу бронювати ресурси для заходів, щоб уникнути конфліктів та забезпечити наявність необхідного

#### Acceptance Criteria

1. THE Event_Management_System SHALL підтримувати три типи Resource: зали, персонал, обладнання
2. WHEN Resource додається до Event, THE Event_Management_System SHALL перевіряти доступність Resource на вказаний час
3. IF Resource вже заброньовано на вказаний час, THEN THE Event_Management_System SHALL повертати помилку з інформацією про конфлікт
4. THE Event_Management_System SHALL створювати Booking з полями: Resource, Event, час початку, час закінчення, статус
5. WHEN Event скасовується, THE Event_Management_System SHALL автоматично скасовувати всі пов'язані Booking
6. THE Event_Management_System SHALL дозволяти перегляд всіх Booking для конкретного Resource за період часу
7. THE Event_Management_System SHALL підтримувати статуси Booking: "Заброньовано", "Підтверджено", "Скасовано"


### Requirement 4: Календар івентів з візуалізацією

**User Story:** Як адміністратор центру, я хочу бачити календар заходів, щоб планувати та контролювати завантаженість центру

#### Acceptance Criteria

1. THE Event_Management_System SHALL надавати Calendar з відображенням всіх Event за обраний період
2. THE Event_Management_System SHALL підтримувати три режими перегляду Calendar: день, тиждень, місяць
3. WHEN користувач обирає Event в Calendar, THE Event_Management_System SHALL відображати детальну інформацію про Event
4. THE Event_Management_System SHALL візуально відрізняти Event за статусами різними кольорами
5. THE Event_Management_System SHALL відображати конфлікти бронювання Resource в Calendar червоним кольором
6. THE Event_Management_System SHALL дозволяти фільтрацію Event в Calendar за типом, статусом, залою
7. THE Event_Management_System SHALL дозволяти створення нового Event через клік на Calendar

### Requirement 5: Управління учасниками та реєстрацією

**User Story:** Як адміністратор центру, я хочу реєструвати учасників на заходи, щоб контролювати кількість та отримувати контактну інформацію

#### Acceptance Criteria

1. THE Event_Management_System SHALL створювати Registration з полями: Participant, Event, статус, дата реєстрації
2. THE Event_Management_System SHALL зберігати інформацію про Participant: ім'я, прізвище, вік, контактний телефон, email
3. WHEN створюється Registration, THE Event_Management_System SHALL перевіряти, що кількість реєстрацій не перевищує максимальну кількість учасників Event
4. IF максимальна кількість учасників досягнута, THEN THE Event_Management_System SHALL додавати Registration до списку очікування
5. THE Event_Management_System SHALL підтримувати статуси Registration: "Очікує підтвердження", "Підтверджено", "Скасовано", "Список очікування"
6. WHEN Registration скасовується, THE Event_Management_System SHALL автоматично переміщувати першого Participant зі списку очікування до підтверджених
7. THE Event_Management_System SHALL дозволяти експорт списку Participant для Event в форматі CSV або Excel

### Requirement 6: Інтеграція з модулем персоналу

**User Story:** Як адміністратор центру, я хочу призначати співробітників на заходи, щоб забезпечити їх проведення

#### Acceptance Criteria

1. THE Event_Management_System SHALL отримувати список доступних Staff_Member з модуля персоналу через API
2. WHEN Staff_Member призначається на Event, THE Event_Management_System SHALL створювати Booking для цього Staff_Member
3. THE Event_Management_System SHALL перевіряти доступність Staff_Member на час Event перед призначенням
4. IF Staff_Member вже призначений на інший Event в цей час, THEN THE Event_Management_System SHALL повертати помилку з інформацією про конфлікт
5. THE Event_Management_System SHALL зберігати роль Staff_Member для Event (аніматор, ведучий, технічний персонал)
6. THE Event_Management_System SHALL дозволяти перегляд всіх Event для конкретного Staff_Member за період часу
7. WHEN Event завершується, THE Event_Management_System SHALL відправляти інформацію про відпрацьовані години Staff_Member до модуля персоналу

### Requirement 7: Інтеграція з модулем бухгалтерії

**User Story:** Як адміністратор центру, я хочу управляти ціноутворенням та оплатою заходів, щоб контролювати фінансові потоки

#### Acceptance Criteria

1. THE Event_Management_System SHALL зберігати Pricing для Event з полями: базова ціна, знижки, додаткові послуги
2. WHEN створюється Registration з статусом "Підтверджено", THE Event_Management_System SHALL створювати Payment запис
3. THE Event_Management_System SHALL відправляти інформацію про Payment до модуля бухгалтерії через API
4. THE Event_Management_System SHALL підтримувати різні типи Pricing: фіксована ціна, ціна за учасника, пакетна ціна
5. THE Event_Management_System SHALL розраховувати загальну вартість Event з урахуванням всіх Registration та додаткових послуг
6. WHEN Event завершується, THE Event_Management_System SHALL відправляти фінансовий звіт до модуля бухгалтерії
7. THE Event_Management_System SHALL дозволяти застосування знижок до Registration з обов'язковим вказанням причини

### Requirement 8: Нотифікації та нагадування

**User Story:** Як адміністратор центру, я хочу відправляти нагадування учасникам та персоналу, щоб зменшити кількість пропусків

#### Acceptance Criteria

1. WHEN Registration підтверджується, THE Event_Management_System SHALL відправляти Notification учаснику з деталями Event
2. THE Event_Management_System SHALL відправляти Notification учаснику за 24 години до початку Event
3. THE Event_Management_System SHALL відправляти Notification учаснику за 2 години до початку Event
4. THE Event_Management_System SHALL відправляти Notification призначеному Staff_Member за 24 години до початку Event
5. WHEN Event скасовується, THE Event_Management_System SHALL відправляти Notification всім зареєстрованим учасникам та призначеному персоналу
6. THE Event_Management_System SHALL підтримувати канали відправки Notification: email, SMS
7. THE Event_Management_System SHALL зберігати історію відправлених Notification з статусом доставки

### Requirement 9: Звіти по івентам

**User Story:** Як адміністратор центру, я хочу переглядати звіти по заходах, щоб аналізувати ефективність та приймати рішення

#### Acceptance Criteria

1. THE Event_Management_System SHALL генерувати Event_Report з полями: назва Event, дата, кількість зареєстрованих, кількість присутніх, дохід, витрати
2. THE Event_Management_System SHALL розраховувати відвідуваність Event як відсоток присутніх від зареєстрованих
3. THE Event_Management_System SHALL розраховувати прибутковість Event як різницю між доходом та витратами
4. THE Event_Management_System SHALL дозволяти генерацію зведеного звіту за період з агрегованими показниками
5. THE Event_Management_System SHALL дозволяти фільтрацію Event_Report за типом Event, датою, залою
6. THE Event_Management_System SHALL дозволяти експорт Event_Report в форматі PDF або Excel
7. THE Event_Management_System SHALL відображати Event_Report у вигляді графіків та діаграм для візуального аналізу

### Requirement 10: API та аутентифікація

**User Story:** Як розробник, я хочу мати захищений API для системи управління івентами, щоб забезпечити безпечний доступ до даних

#### Acceptance Criteria

1. THE Event_Management_System SHALL надавати RESTful API за структурою /api/events/[resource]/route.ts
2. THE Event_Management_System SHALL використовувати JWT токени для аутентифікації запитів через jose або jsonwebtoken
3. WHEN запит надходить без валідного JWT токену, THE Event_Management_System SHALL повертати HTTP статус 401 Unauthorized
4. THE Event_Management_System SHALL перевіряти права доступу користувача перед виконанням операцій
5. THE Event_Management_System SHALL підтримувати ролі: "Адміністратор", "Менеджер", "Персонал", "Клієнт"
6. THE Event_Management_System SHALL логувати всі API запити з інформацією про користувача, дію та час
7. THE Event_Management_System SHALL повертати помилки у стандартизованому JSON форматі з кодом помилки та описом

### Requirement 11: Валідація та обробка помилок

**User Story:** Як користувач системи, я хочу отримувати зрозумілі повідомлення про помилки, щоб коректно виправляти введені дані

#### Acceptance Criteria

1. WHEN користувач вводить некоректні дані, THE Event_Management_System SHALL повертати описову помилку з вказанням поля
2. THE Event_Management_System SHALL валідувати формат email адреси перед збереженням Participant
3. THE Event_Management_System SHALL валідувати формат телефону перед збереженням Participant
4. THE Event_Management_System SHALL валідувати, що дата Event не в минулому при створенні
5. IF виникає помилка з'єднання з MongoDB, THEN THE Event_Management_System SHALL повертати HTTP статус 503 Service Unavailable
6. IF виникає внутрішня помилка сервера, THEN THE Event_Management_System SHALL логувати деталі помилки та повертати HTTP статус 500 Internal Server Error
7. THE Event_Management_System SHALL валідувати всі обов'язкові поля перед збереженням даних в MongoDB

### Requirement 12: Пошук та фільтрація

**User Story:** Як адміністратор центру, я хочу швидко знаходити заходи та учасників, щоб ефективно управляти системою

#### Acceptance Criteria

1. THE Event_Management_System SHALL надавати пошук Event за назвою, типом, датою, статусом
2. THE Event_Management_System SHALL надавати пошук Participant за ім'ям, прізвищем, телефоном, email
3. THE Event_Management_System SHALL підтримувати часткове співпадіння при пошуку (case-insensitive)
4. THE Event_Management_System SHALL дозволяти комбінування декількох фільтрів одночасно
5. THE Event_Management_System SHALL повертати результати пошуку з пагінацією (максимум 50 записів на сторінку)
6. THE Event_Management_System SHALL сортувати результати пошуку за релевантністю або обраним полем
7. WHEN пошуковий запит не повертає результатів, THE Event_Management_System SHALL відображати повідомлення "Нічого не знайдено" з пропозицією змінити критерії пошуку

