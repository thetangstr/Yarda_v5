# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - button "Change language" [ref=e6] [cursor=pointer]:
      - generic [ref=e7]: 🇺🇸
      - generic [ref=e8]: English
      - img [ref=e9]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - link "Yarda" [ref=e13]:
          - /url: /
          - heading "Yarda" [level=1] [ref=e14]
        - paragraph [ref=e15]: Sign in to your account
      - button "Sign in with Google" [ref=e18] [cursor=pointer]:
        - img [ref=e19]
        - generic [ref=e24]: Sign in with Google
      - generic [ref=e30]: Or sign in with magic link
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
          - paragraph [ref=e43]: New users get 3 free trial credits!
          - paragraph [ref=e44]: New to Yarda? Just enter your email above and get a magic link to sign in - your account will be created automatically!
      - button "Looking for the email/password option? Click here" [ref=e46] [cursor=pointer]
  - alert [ref=e47]
```