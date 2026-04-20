# Sabit QR Menü Sistemi

Bu sistem kafeler için sabit QR adresli dijital menü kurar.

QR kodun içinde fiyat veya ürün bilgisi yoktur. QR sadece menünün web adresine gider. Bu yüzden menü, fiyat, kategori, ürün görseli veya stok durumu değiştiğinde QR kodları yeniden basmaya gerek kalmaz.

## Çalıştırma

```bash
npm start
```

Müşteri menüsü:

```text
http://localhost:3000
```

Yönetim paneli:

```text
http://localhost:3000/admin
```

## Nasıl kullanılır?

1. `npm start` ile sistemi açın.
2. `/admin` adresine girin.
3. Kafe bilgilerini, logoyu, masa sayısını, kategorileri, ürünleri, görselleri ve fiyatları düzenleyin.
4. `Kaydet` butonuna basın.
5. `QR Listesini Göster` ile masa adreslerini alın.
6. Bu adresleri QR olarak bastırın.

Masa linkleri şu mantıkla çalışır:

```text
http://site-adresiniz.com/?masa=1
http://site-adresiniz.com/?masa=2
```

Menü değiştiğinde bu adresler aynı kalır.

## Görsel Yükleme

Yönetim panelinden firma logosu ve ürün görselleri yüklenebilir. Görseller menü verisinin içinde saklanır; bu yüzden ek bir dosya sistemi ayarı gerekmez.

Görselleri küçük ve net tutmak iyi sonuç verir. Her görsel için yaklaşık 1.5 MB altı önerilir.

## Veriler Nerede?

Menü verisi:

```text
data/menu.json
```

Yönetici şifresi:

```text
data/config.json
```

## Canlıya Alma Notu

Bu sistem bir sunucuda çalıştırılıp alan adına bağlandığında QR kodlarınızı şu kalıcı adrese bastırabilirsiniz:

```text
https://menunuz.com/?masa=1
```

Alan adı değişmezse QR kodlar da değişmez. Menü ve fiyatlar panelden değişir.

Sunucuda dış ağdan erişim gerekiyorsa:

```bash
HOST=0.0.0.0 PORT=3000 npm start
```

Oracle Cloud Always Free üzerine kurulum için:

```text
ORACLE_CLOUD_KURULUM.md
```

## Güvenlik Notu

Bu sade sürüm küçük işletmeler için kolay kullanım odaklıdır. İnternet üzerinde canlı kullanmadan önce güçlü bir şifre kullanın, sunucuyu HTTPS ile yayınlayın ve panel adresini herkesle paylaşmayın.
