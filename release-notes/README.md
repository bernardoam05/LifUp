Uma pasta por versão (`2.1.0/`), com `en.md`, `pt.md`, `es.md`, `fr.md` e `de.md`: uma alteração por linha, começada por `- `, pela mesma ordem nas cinco línguas.

Cada linha pode levar uma etiqueta logo a seguir ao traço, que dá o ícone na app: `[new]` (novidade), `[fix]` (correção) ou `[tweak]` (ajuste). A primeira frase aparece em destaque e o resto por baixo, por isso convém abrir com uma frase curta que diga o essencial.

As notas vão dentro da APK: a app mostra-as depois de cada atualização (todas as versões desde a última vista) e em Definições → Sobre → Notas de versão.

Quando uma pasta de versão nova chega ao `main`, o workflow `Release` cria a tag e publica essa versão (as etiquetas saem do texto da release no GitHub).
