# משמרות → יומן · Shifts → Calendar

אפליקציית web (רצה כולה בדפדפן) שמקבלת קובץ **PDF** של לוח משמרות, מזהה את המשמרות
לפי הטקסט (תומך **עברית ואנגלית**), ומאפשרת להוסיף אותן ל-**Google Calendar** —
בלחיצה אחת (עם התחברות אופציונלית) או כל משמרת בנפרד (ללא התחברות), וגם הורדת `.ics`.

A browser-only web app that reads a shift-schedule **PDF**, detects shifts from the
text (**Hebrew & English**), and adds them to **Google Calendar** — one click with
optional sign-in, per-shift links without sign-in, or an `.ics` download.

> הקבצים לא עולים לשום שרת — כל העיבוד קורה במחשב/בנייד שלך.
> Files never leave your device — all parsing happens locally in the browser.

**🌐 אונליין / Live:** https://itayliano.github.io/mishmarot/

## פריסה / Deploy

האתר מתארח ב-GitHub Pages מענף `gh-pages`. לעדכון לאחר שינויים:

```bash
npm run deploy   # בונה ודוחף את dist לענף gh-pages
```

(דורש הרשאת git ל-repo. כדי שכפתור "הוסף הכול ל-Google Calendar" יעבוד באתר החי,
יש להוסיף את `https://itayliano.github.io` ל-Authorized JavaScript origins של ה-OAuth Client.)

## הרצה / Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## איך זה עובד / How it works

1. **חילוץ טקסט** — [`src/lib/pdf/extract.ts`](src/lib/pdf/extract.ts) משתמש ב-PDF.js
   כדי לקרוא את הטקסט עם מיקומים, ומקבץ אותו לשורות. אם הקובץ סרוק (אין שכבת טקסט)
   נופלים אוטומטית ל-**OCR** ([`src/lib/pdf/ocr.ts`](src/lib/pdf/ocr.ts), Tesseract.js,
   עברית+אנגלית), שמרנדר כל עמוד לתמונה ומחזיר מילים עם מיקום.
2. **זיהוי משמרות** — [`src/lib/parse/`](src/lib/parse/) מזהה תאריכים ושעות
   (עברית/אנגלית, מספרי וטקסטואלי) בשני מצבים:
   - **רשימה**: תאריך ושעה באותה שורה.
   - **טבלה/גריד**: שורת כותרת של תאריכים, ותאי שעות שממופים לעמודה לפי מיקום.
3. **בדיקה ועריכה** — טבלה הניתנת לעריכה. שורות בוודאות נמוכה מסומנות בצהוב.
   אפשר לסנן לפי שם (כדי לבחור רק את המשמרות שלך), להוסיף/למחוק שורות, ולבחור מה לייצא.
4. **הוספה ליומן** — [`src/lib/calendar/`](src/lib/calendar/): קישור Google לכל משמרת,
   הוספה אוטומטית של הכול דרך Google API (אופציונלי), או הורדת `.ics`.

## הוספה אוטומטית של כל המשמרות (אופציונלי) / One-click "add all" (optional)

ברירת המחדל עובדת בלי שום הגדרה: לכל משמרת יש קישור "הוסף ליומן", ואפשר להוריד `.ics`.
כדי לאפשר את הכפתור **"הוסף הכול ל-Google Calendar"** צריך Google OAuth Client ID:

1. ב-[Google Cloud Console](https://console.cloud.google.com/) צרו פרויקט.
2. הפעילו את **Google Calendar API**.
3. ב-**APIs & Services → Credentials** צרו **OAuth client ID** מסוג **Web application**.
4. תחת **Authorized JavaScript origins** הוסיפו את כתובת האפליקציה
   (למשל `http://localhost:5173` לפיתוח, וכתובת הייצור שלכם).
5. העתיקו את ה-Client ID לקובץ `.env` (ראו `.env.example`):

   ```
   VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```

ההתחברות והוספת האירועים קורות כולן בדפדפן (Google Identity Services). ההרשאה
מבקשת רק `calendar.events` (הוספת אירועים).

## פורמטים נתמכים / Supported formats

- תאריכים: `22/06/2025`, `22.6`, `2025-06-22`, `22 ביוני 2025`, `June 22, 2025`,
  עם זיהוי יום/חודש מול חודש/יום (ניתן להחלפה בממשק).
- שעות: `07:00-15:00`, `07:00 עד 15:00`, `7:00 to 15:00`, משמרות לילה (סיום למחרת).
- כותרות: בוקר/צהריים/ערב/לילה · morning/noon/evening/night.

**PDF סרוק / מצולם** נתמך דרך OCR אוטומטי (Tesseract.js בדפדפן). בטעינה הראשונה
מורדים נתוני שפה (~10–15MB) והעיבוד איטי יותר; תוצאות ה-OCR מסומנות בוודאות נמוכה
כדי להזכיר לבדוק אותן. לקבצים דיגיטליים (עם שכבת טקסט) לא מורץ OCR — מהיר ומדויק.

## מבנה / Structure

```
src/
  lib/pdf/        חילוץ טקסט מ-PDF
  lib/parse/      זיהוי תאריכים, שעות, ומשמרות (לוגיקה טהורה, ללא DOM)
  lib/calendar/   ICS, קישור Google, Google API
  i18n/           מחרוזות ממשק he/en
  components/      רכיבי UI
```

הלוגיקה ב-`lib/parse` ו-`lib/calendar` היא טהורה וללא תלות בדפדפן, כדי שאפשר יהיה
להריץ אותה גם ב-backend בעתיד.
