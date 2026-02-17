import { fetchFocusMusicCatalog } from "../lib/focus-music/catalog";
import { supabase } from "../lib/supabaseClient";

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("fetchFocusMusicCatalog", () => {
  test("returns catalog sorted by natural numeric title order", async () => {
    const orderMock = jest.fn().mockResolvedValue({
      data: [
        {
          id: "track-10",
          title: "10",
          bucket: "focus-music",
          storage_path: "tracks/10.mp3",
          duration: 120,
          music_category: ["study"],
        },
        {
          id: "track-2",
          title: "2",
          bucket: "focus-music",
          storage_path: "tracks/2.mp3",
          duration: 120,
          music_category: ["study"],
        },
        {
          id: "track-1",
          title: "1",
          bucket: "focus-music",
          storage_path: "tracks/1.mp3",
          duration: 120,
          music_category: ["study"],
        },
        {
          id: "track-0",
          title: "0",
          bucket: "focus-music",
          storage_path: "tracks/0.mp3",
          duration: 120,
          music_category: ["study"],
        },
      ],
      error: null,
    });
    const selectMock = jest.fn().mockReturnValue({ order: orderMock });
    (supabase.from as jest.Mock).mockReturnValue({ select: selectMock });

    const tracks = await fetchFocusMusicCatalog();

    expect(tracks.map((track) => track.title)).toEqual(["0", "1", "2", "10"]);
  });
});
