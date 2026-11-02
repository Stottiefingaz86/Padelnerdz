import { NextResponse } from "next/server";

/** Latest EAS preview APK, override with ANDROID_APK_URL when you ship a new build. */
const DEFAULT_APK =
  "https://expo.dev/artifacts/eas/4UliXudMfbkt76_uDkybp3tKv8XIrzO2zF0V2m4MJAU.apk";

export function GET() {
  const url = process.env.ANDROID_APK_URL?.trim() || DEFAULT_APK;
  return NextResponse.redirect(url, 302);
}
