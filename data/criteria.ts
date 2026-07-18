export type Criterion = {
  id: string;
  name: string;
  description: string;
};

export const criteriaByCategory: Record<string, Criterion[]> = {
  tent: [
    {
      id: "easy-setup",
      name: "設営が簡単",
      description: "短時間で迷わず設営できる",
    },
    {
      id: "lightweight",
      name: "軽い",
      description: "持ち運びの負担が少ない",
    },
    {
      id: "wind-resistant",
      name: "耐風性が高い",
      description: "強い風でも安定しやすい",
    },
    {
      id: "waterproof",
      name: "防水性が高い",
      description: "雨が降っても内部に水が入りにくい",
    },
    {
      id: "spacious",
      name: "居住空間が広い",
      description: "人数や荷物に対して十分な広さがある",
    },
    {
      id: "compact-storage",
      name: "収納サイズが小さい",
      description: "収納時にかさばりにくい",
    },
  ],

  tarp: [
    {
      id: "easy-setup",
      name: "設営が簡単",
      description: "少ない手順で設営できる",
    },
    {
      id: "wide-shade",
      name: "日陰が広い",
      description: "十分な有効面積を確保できる",
    },
    {
      id: "wind-resistant",
      name: "耐風性が高い",
      description: "風を受けても安定しやすい",
    },
    {
      id: "waterproof",
      name: "防水性が高い",
      description: "雨天でも使いやすい",
    },
  ],

  chair: [
    {
      id: "comfortable",
      name: "座り心地が良い",
      description: "長時間座っても疲れにくい",
    },
    {
      id: "lightweight",
      name: "軽い",
      description: "持ち運びしやすい",
    },
    {
      id: "compact-storage",
      name: "収納サイズが小さい",
      description: "車載や保管がしやすい",
    },
    {
      id: "stable",
      name: "安定感がある",
      description: "ぐらつきが少なく座りやすい",
    },
  ],
};