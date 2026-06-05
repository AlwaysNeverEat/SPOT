---
description: Оптимизировать медиа и подгрузку
allowed-tools: Bash, Edit
---
Пройдись по img/video в index.html:
- добавь loading="lazy" и decoding="async" где их нет
- проставь width/height чтобы не было layout shift
- проверь размеры файлов в photos/ и video/, скажи какие реально жирные (>1MB)
Не конвертируй ничего без моего ок — сначала покажи список.