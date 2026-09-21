# ZAAL — Google Play submission package

Everything below is ready to copy straight into Google Play Console. The two image files (icon + feature graphic) are attached alongside this doc.

## 1. App details
- **App name** (max 30 chars): ZAAL: Farsi for Kids
- **Short description** (max 80 chars): Fun Farsi alphabet games, stories & coloring for kids. 100% free.
- **Package name**: com.zaal.app *(already set in app.json — cannot be changed after your first upload)*
- **Category**: Education (or Educational, under Family)
- **Tags**: kids, education, language learning

## 2. Full description (max 4000 chars)
ZAAL is a playful way for kids to learn and love the Persian (Farsi) alphabet, words, and stories — built for Persian-speaking families raising bilingual kids anywhere in the world.

Inside ZAAL:
- Learn the Persian alphabet through games, letter tracing, and voice narration
- Age-tailored content from Baby World (0-2) up through Persian Star (10-12)
- Farsi read-aloud audiobooks and original stories, like "Neli and Nowruz"
- Coloring pages, a memory game, a cooking game, and a Talk & Play speaking game
- Earn stars and badges as your child progresses
- A parent PIN protects Settings so kids can't change language or account details
- No ads. No account required to start playing.

ZAAL is completely free to use.

## 3. Store listing graphics (attached)
- `play-store-icon-512.png` — 512×512 app icon
- `feature-graphic-1024x500.png` — feature graphic for the store listing header
- **Screenshots — still needed, see section 6 below.**

## 4. Privacy policy URL
Paste this into Play Console → App content → Privacy policy:
**https://zaalapp.com/privacy.html**

## 5. App content section — suggested answers

**Target audience and content**
Include children (under 13) in the declared age groups, since ZAAL is aimed at kids with parental supervision. This pulls the listing into Google's Families Policy — complete the Families self-certification checklist once the listing is set up (no ad SDK is present, so the ads-certification step doesn't apply).

**Content rating (IARC) questionnaire**
- Violence, sexual content, profanity, controlled substances, gambling: None
- User-generated content, sharing location, unrestricted internet: No
- Expected result: Everyone / PEGI 3

**Data safety form**
- Does your app collect or share user data? Yes
- Data type: Personal info → Email address and/or Phone number
  - Collected: Yes | Shared with third parties: No | Optional: No (required to activate an account)
  - Purpose: Account management (one-time parent verification via Supabase)
  - Encrypted in transit: Yes
  - Users can request data deletion: Yes (bahar.bahreman@gmail.com)
- No other data types collected — no location, financial info, photos, device identifiers, or analytics/advertising data. ZAAL has no ad or analytics SDKs.

## 6. Screenshots — the one thing still missing
Google Play requires at least 2 real screenshots taken from the running app (not mockups) — up to 8, JPEG or 24-bit PNG, each side between 320px and 3840px.

I can't capture these myself right now — there's no way for me to run the actual app from here (no emulator in my workspace, and I don't currently have shell access on your computer to launch one). Since ZAAL is locked to landscape (`orientation: "landscape"` in app.json), any screenshot you take will already be in the right orientation — no rotating needed.

Fastest way to get them yourself (about 5 minutes):
1. In the project folder, run `npx expo start`.
2. Press `a` to open it in an Android emulator, or scan the QR code with Expo Go on your own Android phone.
3. Visit 4-6 different screens that show ZAAL off well — e.g. Home, the Alphabet game, an audiobook/story screen, Coloring, the Cooking game.
4. Take the screenshot:
   - Emulator: click the camera icon in the emulator toolbar (or Ctrl/Cmd+S).
   - Physical phone: press Power + Volume Down together.
5. Send the image files back to me here — I'll check sizing and get them Play-Console-ready, or you can upload them straight into Play Console yourself.

## 7. Build reminder
Your production Android build command (run from the project folder):
```
EAS_NO_VCS=1 eas build --platform android --profile production
```
Once it finishes, `eas submit --platform android` uploads the .aab straight to Play Console, or you can download it and upload manually.
