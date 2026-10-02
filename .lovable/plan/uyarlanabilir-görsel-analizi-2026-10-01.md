# Uyarlanabilir Görsel Analizi

## Amaç
Ana sayfanın tek ekranlık güçlü görsel yapısını korurken kullanıcıların yeni bir arka plan görseli yükleyip farklı ekran oranları için AI destekli yerleşim önerileri almasını sağlamak.

## Yapılacaklar
- Ana sayfaya, görsel kompozisyonu bozmayan açılır bir “Görseli analiz et” çalışma alanı eklemek.
- JPG, PNG ve WebP yükleme; önizleme, dosya doğrulama, analiz durumu, hata ve sıfırlama akışlarını tamamlamak.
- Görseli Lovable AI üzerinden güvenli biçimde analiz eden sunucu uç noktası eklemek.
- Sonuçlarda masaüstü, tablet ve mobil için ayrı ayrı ölçek, odak noktası, metin konumu ve gölge önerileri göstermek.
- Önerileri anlaşılır sayısal değerler ve kısa gerekçelerle sunmak; mevcut referans görselini değiştirmemek.
- Masaüstü ve mobil görünümü, gerçek analiz çağrısını ve hata durumlarını doğrulamak.

## Teknik Ayrıntılar
- Görsel verisi yalnızca analiz isteği sırasında sunucuya iletilecek; kalıcı olarak saklanmayacak.
- AI çağrısı sunucu tarafında Lovable AI Gateway ve `openai/gpt-6-astra` Responses API üzerinden çalışacak.
- Yanıt küçük ve doğrulanabilir bir şemaya dönüştürülecek; anahtar veya sistem istemi tarayıcıya gönderilmeyecek.
- Yeni işlev için Lovable Cloud ve yönetilen AI anahtarı kullanılacak.
