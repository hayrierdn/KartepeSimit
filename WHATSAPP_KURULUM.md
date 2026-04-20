# WhatsApp Otomatik Sipariş Bildirimi

Bu sistem sipariş geldiğinde WhatsApp Cloud API ile otomatik bildirim gönderecek şekilde hazırlandı.

## Gerekli Bilgiler

Meta tarafından verilen şu bilgiler gerekir:

```text
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_TOKEN
WHATSAPP_TO
WHATSAPP_TEMPLATE_NAME
WHATSAPP_TEMPLATE_LANGUAGE
WHATSAPP_API_VERSION
```

## Meta'da Yapılacaklar

1. [Meta for Developers](https://developers.facebook.com/) hesabına girin.
2. Business türünde bir uygulama oluşturun.
3. Uygulamaya WhatsApp ürününü ekleyin.
4. WhatsApp API Setup ekranından `Phone Number ID` bilgisini alın.
5. Meta Business ayarlarından bir System User oluşturun.
6. Bu kullanıcıya WhatsApp yetkilerini verin:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - gerekirse `business_management`
7. System User için kalıcı access token üretin.
8. WhatsApp Manager'da bir mesaj template'i oluşturun ve onaya gönderin.

## Önerilen Template

Template adı:

```text
kartepe_siparis_bildirimi
```

Dil:

```text
tr
```

Kategori:

```text
UTILITY
```

Gövde metni:

```text
Yeni sipariş geldi:
{{1}}
```

Bu template onaylandıktan sonra sistem sipariş içeriğini `{{1}}` alanına koyup otomatik gönderir.

## .env Dosyası

Proje klasöründe `.env` dosyası oluşturun:

```bash
cp .env.example .env
```

Sonra içini doldurun:

```text
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_TOKEN=EAAB...
WHATSAPP_TO=905xxxxxxxxx
WHATSAPP_TEMPLATE_NAME=kartepe_siparis_bildirimi
WHATSAPP_TEMPLATE_LANGUAGE=tr
WHATSAPP_API_VERSION=v21.0
```

Ardından sunucuyu başlatın:

```bash
npm start
```

## Önemli Not

WhatsApp'ta müşteriye veya personele işletme tarafından başlatılan bildirimler için en sağlam canlı kullanım onaylı template mesajıdır. Düz metin mesajlar yalnızca ilgili kullanıcıyla açık 24 saatlik WhatsApp konuşma penceresinde sorunsuz çalışır. Bu yüzden canlı kurulumda template kullanın.
