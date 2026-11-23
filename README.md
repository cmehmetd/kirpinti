# Kırpıntı

> Parçalardan bir defter.

Kırpıntı, kağıt dokulu, sıcak ve nostaljik bir **dijital junk journal ve kolaj defteri** uygulamasıdır. Fotoğraflarını, vintage çıkartmalarını, videolarını, el yazısı notlarını ve el çizimlerini sayfalara yerleştirip bir defter oluşturabilirsin. Tamamlanan defteri PNG görsel ya da sayfa çevirme geçişli bir video olarak dışa aktarabilirsin.

Uygulama tamamen **istemci tarafında** çalışır: sunucu, hesap sistemi ya da veritabanı gerektirmez. Tüm veriler kendi tarayıcında saklanır.

## Uygulamayı kullanmak

Kırpıntı'yı tarayıcıdan açmak için: **[https://cmehmetd.github.io/kirpinti/](https://cmehmetd.github.io/kirpinti/)**

Telefonda açıp ana ekrana ekleyerek uygulama gibi de kullanabilirsin.

## Özellikler

### Defter ve sayfalar
- Birden fazla sayfadan oluşan defterler (bir defterde en fazla 20 sayfa)
- Sayfa sekmeleri ile hızlı geçiş, sayfa ekleme ve silme
- Sayfa arka planları: krem, noktalı, çizgili, kareli, kraft, parşömen ve gece moru
- Galeride defter kartları, küçük önizleme ve sayfa sayısı

### Öğeler
- **Fotoğraf:** galeriden görsel ekleme (otomatik olarak küçültülür)
- **Video:** video ekleme; sayfada ilk kare afiş olarak görünür, dışa aktarımda oynar
- **Çıkartma:** 9 hazır vintage çıkartma (bilet, bant, yıldız, kalp, damga, çiçek, yaprak, zarf, dantel) ve kendi PNG çıkartmalarını ekleme
- **Metin:** 7 el yazısı ve daktilo yazı tipi, 5 renk, boyut ayarı
- **Çizim:** serbest el çizimi; renk ve kalınlık seçimi, geri alma. Bitince çizim, taşınabilir bir öğe olur.

Tüm öğeler parmakla **sürüklenebilir, döndürülebilir ve boyutlandırılabilir**. Bir öğeyi seçince Düzenle, Çoğalt, Sil ve Bırak seçenekleri çıkar.

### Dışa aktarma
- **PNG:** açık olan sayfanın yüksek çözünürlüklü görüntüsü
- **Video (MP4 / WebM):** tüm sayfalar sırayla; sayfalar arasında kitap sayfası çevirme geçişi. Toplam süre en fazla **60 saniye**. Sayfadaki videolar kendi döngüsünde oynar.

### Görünüm
- Açık, koyu ve sistem teması
- Vurgu rengi: `#1AA9FF`
- Kağıt sayfası her temada kağıt rengini korur

### Hesap ve güvenlik
- İlk açılışta ad ve şifre belirlenir (en az 4 karakter)
- Şifre, PBKDF2-SHA256 ile tuzlanarak özetlenip yalnızca bu cihazda saklanır
- Uygulama her açılışta şifre ister; 5 dakikadan uzun arka planda kalınca kilitlenir
- Profil sayfasından şifre değiştirilebilir (önce eski şifre istenir)
- Tüm verileri ve hesabı silme seçeneği

### Uygulama olarak kurulum (PWA)
- Telefonda ana ekrana eklenebilir ve tarayıcı çubuğu olmadan açılır
- Service worker ile uygulama dosyaları önbelleğe alınır; internet olmadan da açılır
- Uygulama içi onay pencereleri ve bildirimler özel tasarımlıdır

## Dosya yapısı

```
kirpinti/
├── index.html            # Arayüz iskeleti (galeri, editör, profil, şifre ekranı)
├── style.css             # Tasarım: kağıt dokusu, açık/koyu tema, bileşenler
├── app.js                # Uygulama mantığı: öğeler, çizim, şifre, dışa aktarma
├── sw.js                 # Service worker (çevrimdışı önbellek)
├── manifest.webmanifest  # PWA tanımı (ad, renkler, simgeler)
├── icon.svg              # Uygulama simgesi (vektör)
```

## Veri nerede saklanır?

| Veri | Nerede |
|---|---|
| Defterler, sayfalar, öğeler, fotoğraflar | `localStorage` (`kirpinti:pages`) |
| Profil ve şifre özeti | `localStorage` (`kirpinti:profile`) |
| Kendi çıkartmaların | `localStorage` (`kirpinti:stickers`) |
| Video dosyaları | IndexedDB (`kirpinti` veritabanı) |

Tarayıcı verilerini temizlerseniz içerik silinir. Önemli defterlerinizi düzenli olarak PNG ya da video olarak dışa aktarmanız önerilir.

Uygulama hiçbir servise veri göndermez. Google Fonts yalnızca yazı tiplerini yüklemek için kullanılır.

## Tarayıcı desteği

| Özellik | Gereksinim |
|---|---|
| Temel düzenleme | Modern masaüstü ve mobil tarayıcılar |
| Şifre (PBKDF2) | Güvenli bağlam (`https://`) |
| Service worker / PWA | Güvenli bağlam; iOS'ta Safari "Ana Ekrana Ekle" |
| Video dışa aktarma | `MediaRecorder` ve `canvas.captureStream` desteği (MP4 için Safari veya yeni Chromium, WebM için Chrome, Edge, Firefox) |

## Bilinen sınırlamalar

- Yerel depolama yaklaşık 5 MB ile sınırlıdır. Çok sayıda yüksek çözünürlüklü fotoğraf eklenirse "Depolama dolu" uyarısı çıkabilir.
- Video dışa aktarma gerçek zamanlı kaydedilir. 60 saniyelik bir video yaklaşık bir dakika sürer ve kayıt sırasında uygulamanın açık ve görünür kalması gerekir.
- Şifre yalnızca bu cihazda tutulur. Unutulursa tek çözüm tüm verileri silmektir.
- Hesap ve veriler cihazlar arasında senkronize edilmez.
- Sayfa çevirme animasyonu 2B çizilir; gerçek bir kağıt simülasyonu değildir.

## Katkıda bulunma

1. Depoyu çatallayın (fork).
2. Yeni bir dal açın: `git checkout -b ozellik/yeni-ozellik`.
3. Değişikliklerinizi yapın ve tarayıcıda deneyin.
4. Bir çekme isteği (pull request) gönderin.

Hata bildirimleri ve öneriler için sorun (issue) açabilirsiniz.

## Lisans

Bu proje [GNU General Public License v3.0 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0.html) ile lisanslanmıştır. Ayrıntılar için `LICENSE` dosyasına bakın.

---

Kırpıntı ile yaptığınız defterleri paylaşmaktan çekinmeyin.
