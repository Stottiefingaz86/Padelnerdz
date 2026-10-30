import { Redirect } from 'expo-router';

/** Deep links / old `/shop` routes land on the Shop tab. */
export default function ShopRedirect() {
  return <Redirect href="/(tabs)/shop" />;
}
