import { Linking, Share } from "react-native";

export { buildDispatchMessage } from "./dispatchMessage";

export async function shareViaWhatsApp(message: string): Promise<void> {
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?text=${encoded}`;
  try {
    const supported = await Linking.canOpenURL(whatsappUrl);
    if (supported) {
      await Linking.openURL(whatsappUrl);
      return;
    }
  } catch {
    // Fall back to Android system share sheet when WhatsApp package query is restricted.
  }
  await shareViaSystemSheet(message);
}

export async function shareViaSms(message: string): Promise<void> {
  const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(smsUrl);
    return;
  } catch {
    await shareViaSystemSheet(message);
  }
}

export async function shareViaSystemSheet(message: string): Promise<void> {
  try {
    await Share.share({
      title: "ATIE Market Dispatch",
      message,
    });
  } catch {
    // Ignore dismissed or unsupported share sheet errors on restricted devices.
  }
}
