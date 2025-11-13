# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - button "Change language" [ref=e6] [cursor=pointer]:
      - generic [ref=e7]: 🇪🇸
      - generic [ref=e8]: Español
      - img [ref=e9]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - link "Yarda" [ref=e13] [cursor=pointer]:
          - /url: /
          - heading "Yarda" [level=1] [ref=e14]
        - paragraph [ref=e15]: Inicia sesión en tu cuenta
      - button "Sign in with Google" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
        - generic [ref=e24]: Sign in with Google
      - generic [ref=e30]: O inicia sesión con enlace mágico
      - generic [ref=e32]:
        - generic [ref=e33]:
          - generic [ref=e34]: Email Address
          - textbox "Email Address" [ref=e35]:
            - /placeholder: Enter your email
        - button "Send Magic Link" [disabled] [ref=e36]
        - paragraph [ref=e37]: You'll receive an email with a link to sign in. Check your spam folder if you don't see it.
      - generic [ref=e39]:
        - img [ref=e40]
        - generic [ref=e42]:
          - paragraph [ref=e43]: ¡Los nuevos usuarios obtienen 3 créditos de prueba gratis!
          - paragraph [ref=e44]: ¿Nuevo en Yarda? Solo ingresa tu correo arriba y obtén un enlace mágico para iniciar sesión - ¡tu cuenta se creará automáticamente!
      - button "¿Buscas la opción de correo electrónico/contraseña? Haz clic aquí" [ref=e46] [cursor=pointer]
  - alert [ref=e47]
  - generic [ref=e50] [cursor=pointer]:
    - img [ref=e51]
    - generic [ref=e53]: 1 error
    - button "Hide Errors" [ref=e54]:
      - img [ref=e55]
```