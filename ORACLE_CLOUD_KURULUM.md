# Oracle Cloud Always Free Kurulum

Bu dokuman Kartepe Simit QR menu sistemini Oracle Cloud Always Free VM uzerinde calistirmak icindir.

## 1. Oracle hesabini ac

1. Oracle Cloud Free Tier sayfasindan hesap ac.
2. Home region olarak Turkiye'ye yakin bir bolge sec. Frankfurt genelde iyi bir tercihtir.
3. Telefon ve kart dogrulamasini tamamla.

Not: Oracle Always Free kaynaklari home region icinde olusturulur. Yanlis bolge secilirse ucretsiz VM'i baska bolgeye tasimak kolay degildir.

## 2. Always Free VM olustur

Oracle panelinde:

1. Menu > Compute > Instances.
2. Create instance.
3. Image: Ubuntu 22.04 veya Ubuntu 24.04.
4. Shape: VM.Standard.A1.Flex.
5. Always Free etiketi gorunmeli.
6. OCPU: 1, Memory: 6 GB yeterlidir.
7. SSH key: bilgisayarindaki public key'i ekle veya Oracle'in key uretmesine izin ver.
8. Create.

Kapasite hatasi alirsan ayni bolgede farkli availability domain dene. Yine olmazsa biraz bekleyip tekrar dene.

## 3. Internet portlarini ac

Instance detayinda:

1. Virtual cloud network linkine gir.
2. Security Lists veya Network Security Groups bolumune gir.
3. Ingress rules icine su kurallari ekle:

```text
TCP 22   kaynak 0.0.0.0/0
TCP 80   kaynak 0.0.0.0/0
TCP 443  kaynak 0.0.0.0/0
```

22 SSH icin, 80 web sitesi icin, 443 HTTPS icin kullanilir.

## 4. Sunucuya baglan

Mac terminalinden:

```bash
ssh ubuntu@SUNUCU_PUBLIC_IP
```

Oracle'in verdigi key dosyasini kullanacaksan:

```bash
ssh -i ~/Downloads/oracle-key.key ubuntu@SUNUCU_PUBLIC_IP
```

## 5. Sunucuyu hazirla

Sunucuda:

```bash
sudo apt update
sudo apt install -y nodejs npm nginx unzip
sudo mkdir -p /opt/kartepe-simit
sudo chown -R ubuntu:ubuntu /opt/kartepe-simit
```

## 6. Projeyi sunucuya yukle

Kendi bilgisayarinda proje klasorunun icindeyken:

```bash
rsync -av --exclude ".env" --exclude "node_modules" ./ ubuntu@SUNUCU_PUBLIC_IP:/opt/kartepe-simit/
```

Key dosyasi gerekiyorsa:

```bash
rsync -av -e "ssh -i ~/Downloads/oracle-key.key" --exclude ".env" --exclude "node_modules" ./ ubuntu@SUNUCU_PUBLIC_IP:/opt/kartepe-simit/
```

## 7. Telegram ayarini sunucuda gir

Sunucuda:

```bash
cd /opt/kartepe-simit
cp .env.example .env
nano .env
```

Sunucudaki `.env` icinde bunlar olmali:

```text
PORT=3000
HOST=127.0.0.1
TELEGRAM_BOT_TOKEN=BOT_TOKEN_BURAYA
TELEGRAM_CHAT_ID=GRUP_CHAT_ID_BURAYA
```

Token'i kimseyle paylasma. Daha once sohbette paylasildiysa canliya gecmeden BotFather uzerinden token'i yenilemek en dogrusu olur.

## 8. Servisi kur

Sunucuda:

```bash
sudo cp /opt/kartepe-simit/deploy/kartepe-simit.service /etc/systemd/system/kartepe-simit.service
sudo systemctl daemon-reload
sudo systemctl enable kartepe-simit
sudo systemctl start kartepe-simit
sudo systemctl status kartepe-simit
```

Durum ekraninda `active (running)` gorunmeli.

## 9. Nginx ile yayina ac

Sunucuda:

```bash
sudo cp /opt/kartepe-simit/deploy/nginx-kartepe-simit.conf /etc/nginx/sites-available/kartepe-simit
sudo ln -s /etc/nginx/sites-available/kartepe-simit /etc/nginx/sites-enabled/kartepe-simit
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Tarayicida:

```text
http://SUNUCU_PUBLIC_IP
```

Yonetim paneli:

```text
http://SUNUCU_PUBLIC_IP/admin
```

Siparis takip ekrani:

```text
http://SUNUCU_PUBLIC_IP/orders
```

## 10. Domain ve HTTPS

Domain varsa DNS tarafinda A kaydini Oracle sunucunun public IP adresine yonlendir:

```text
A kaydi: @ veya menu
Deger: SUNUCU_PUBLIC_IP
```

Domain oturduktan sonra HTTPS icin:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d DOMAIN_ADI
```

QR kodlari basarken HTTPS domain adresini kullan:

```text
https://DOMAIN_ADI/?masa=1
https://DOMAIN_ADI/?masa=2
```

## 11. Kontrol listesi

1. Menu aciliyor mu?
2. Admin panel sifresi calisiyor mu?
3. Telegram test mesaji gruba dusuyor mu?
4. Müşteri siparisi Telegram grubuna dusuyor mu?
5. `/orders` ekraninda yeni siparis sesli ve belirgin gorunuyor mu?
6. QR adreslerinde masa numarasi dogru geliyor mu?

## 12. Yedek alma

Menuler ve siparisler `data` klasorundedir. Ara sira sunucudan bilgisayara cek:

```bash
rsync -av ubuntu@SUNUCU_PUBLIC_IP:/opt/kartepe-simit/data/ ./data-yedek/
```
