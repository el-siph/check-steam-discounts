import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import urlMetadata from "url-metadata";

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const fetchSteamStoreLinkTitle = async (game) => {
  try {
    const url = `${process.env.CORS_PROXY}/${game.storeLink}`;

    const metadata = await urlMetadata(url, {
      requestHeaders: {
        origin: process.env.ORIGIN_URL,
      },
    });

    return metadata.title;
  } catch (err) {
    console.error(err);

    return null;
  }
};

const fetchDiscount = async (game) => {
  const title = await fetchSteamStoreLinkTitle(game);

  if (!title) return false;
  else if (!title.includes("Save ")) return false;
  else {
    let stringArr = title.split("Save ");

    stringArr = stringArr[1].split("%");

    const discountPercent = parseFloat(stringArr[0]) / 100;

    return discountPercent;
  }
};

export const checkForDiscounts = async () => {
  const { data: steamGames, error: gamesError } = await supabase
    .from("games")
    .select(
      `
      id,
      title,
      msrp,
      storeLink,          
      discounts (
          discountPercent,
          lastChecked
      )
      `
    )
    .like("storeLink", "%steam%");

  const { data: discounts, error: discountsError } = await supabase
    .from("discounts")
    .select("id, gameId");

  if (discountsError) throw discountsError;

  if (steamGames) {
    const existingDiscounts = discounts.map((discount) => discount.gameId);

    // check each Steam game web title
    for (const game of steamGames) {
      const discount = await fetchDiscount(game);
      if (discount) {
        if (existingDiscounts.includes(game.id)) {
          const { data, error } = await supabase
            .from("discounts")
            .update({
              discountPercent: discount,
              lastChecked: new Date().toISOString(),
            })
            .eq("gameId", game.id);
          if (error) console.error(error);
        } else {
          const { error } = await supabase.from("discounts").insert({
            gameId: game.id,
            discountPercent: discount,
          });
          if (error) console.error(error);
        }
      }
    }
  } else if (gamesError) console.error(gamesError);
};
