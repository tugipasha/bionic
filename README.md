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
- Çeviri API'si: `POST /api/translate` `{ text, source_lang, target_lang }` (dil kodu). Groq, ardından MyMemory
  yedeği; uzun metinler satır yapısı korunarak parçalanır (`src/lib/translate-core.ts`).

## Emoji politikası

Sitede hiçbir yerde emoji kullanılmaz (bayraklar dahil). Diller `LangBadge` ile dil kodu rozeti olarak,
vurgular `lucide-react` ikonlarıyla gösterilir. Yapay zeka çıktıları da sunucuda emojilerden arındırılır.
Kontrol: `npm run check:emoji`

## Yapay zeka katmanı

- Tüm Groq çağrıları `src/lib/groq-core.server.ts` üzerinden geçer: model listesi `/models` ile canlı okunur,
  tercih sırasına göre en fazla 3 model denenir; zaman aşımı, yedekleme, düşünme bloğu ve emoji temizliği vardır.
- Groq eski modelleri düzenli kapatır (ör. `llama-3.3-70b-versatile` 16.08.2026'da). Sabit model adı gerekmez;
  tercih sırası `PREFERRED` listesindedir.
- Asistan görev türüne göre uzunluk ayarlar: sohbet kısa, yazma/özet/çeviri görevleri eksiksiz çıktı verir.
- Okuma testi metinleri kelime sayısı doğrulanarak üretilir (±%12 dışındaysa bir kez düzeltme istenir).

## Mobil

- `viewport-fit=cover`, güvenli alan (çentik/ana ekran çubuğu) boşlukları ve `dvh` birimleri.
- Telefonlarda giriş alanları 16px (iOS yakınlaştırmasını önler), dokunma hedefleri en az 40px.
- Arka plan görseli 1.9 MB PNG yerine 28 KB (mobil) / 76 KB (masaüstü) WebP.
