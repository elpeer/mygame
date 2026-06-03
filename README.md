# mygame — אתר נחיתה

אתר נחיתה למשחקים אישיים כמתנה (עברית, RTL). קוד נקי, ללא Framer/React.

## מבנה הפרויקט

```
clean/
├── index.html      # הדף הבנוי (נוצר ע"י convert.js — אל תערוך ידנית)
├── mobile.html     # פריסת המובייל (נערך ידנית)
├── convert.js      # ממיר/בונה: מרכיב את index.html מהמקור + מובייל + תיקונים
├── server.js       # שרת סטטי מקומי
├── img/            # תמונות בשמות ידידותיים
├── fonts/          # פונטים (Ploni Round AAA / Varela Round)
└── figma-assets/   # נכסים שחולצו מ-Figma
```

## הרצה מקומית

```bash
cd clean
node server.js
# פתח http://localhost:8125
```

## בנייה מחדש (אחרי שינוי ב-mobile.html או convert.js)

```bash
cd clean
node convert.js     # מרכיב מחדש את index.html
```

## פריסה (Deploy)

מחברים את ה-repo ל-Vercel/Netlify ומגדירים את תיקיית `clean` כ-root.

---
🤖 נבנה עם Claude Code
