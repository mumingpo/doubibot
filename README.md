# doubibot

## usage

Use a dedicated account on the streaming website to avoid any possible repercussions.
为了预防可能带来的后果, 请使用专门的某站账号(小号)来运行bot.

Log in and go to target streaming room. In F12 developer console, type in:
登录某站并进入直播间. 在f12控制台, 输入:

```javascript
const bot = (await import('https://unpkg.com/doubibot@0.1.12')).default();
```

and hit enter. To enable detailed logging, type in:
并回车. 如想看详细log, 输入:

```javascript
bot.verbose = true;
```
