# BionicText

Biyonik okuma, çok dilli çeviri (30 dil), okuma testi/yarışı ve AI asistan platformu.
TanStack Start + React 19 + Tailwind 4 + Supabase.

## Çalıştırma

```sh
npm install
cp .env.example .env   # anahtarları doldurun
npm run dev            # http://localhost:3000
```

Anahtarlar **opsiyoneldir**:

| Değişken | Yoksa ne olur? |
| --- | --- |
| `GROQ_API_KEY` | Çeviri otomatik olarak ücretsiz MyMemory servisine düşer; AI asistan ve test üretimi çalışmaz |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (+ `SUPABASE_*`) | Giriş/kayıt devre dışı kalır; site "Hemen Dene" ile misafir olarak kullanılabilir, ayarlar yerelde saklanır |

Supabase tablolarını `supabase/schema.sql` ile oluşturun.

## Dil sistemi (i18n)

- Diller ve çeviriler: `src/lib/i18n.ts` (30 dil, RTL: ar/he/fa). Yeni metin için önce `TranslationKey`
  ve `tr`/`en` sözlüklerine anahtar ekleyin; eksik dillerde İngilizce, sonra Türkçe kullanılır.
- Bileşenlerde `const { t, siteLang, setSiteLang } = useSiteLanguage();` kullanın. Hook SSR ile
  uyumludur (ilk render varsayılan dil, mount sonrası kayıtlı/tarayıcı dili).
- Dil değişince `<html lang>` ve `dir` otomatik güncellenir.
- Çeviri API'si: `POST /api/translate` `{ text, source_lang, target_lang }` (dil kodu). Groq → MyMemory
  yedeği; uzun metinler satır yapısı korunarak parçalanır (`src/lib/translate-core.ts`).
