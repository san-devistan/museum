import type { ArtworkLabel } from "@/museum/_lib/exhibit"
import aSwanInTheCity from "@/museum/collection/photos/a-swan-in-the-city.jpg"
import abysses from "@/museum/collection/photos/abysses.jpg"
import brain from "@/museum/collection/photos/brain.jpg"
import cannibalFlowers from "@/museum/collection/photos/cannibal-flowers.jpg"
import celleQuiVientDuDedans from "@/museum/collection/photos/celle-qui-vient-du-dedans.jpg"
import fashionChaosOne from "@/museum/collection/photos/fashion-chaos-1.jpg"
import fashionChaosTwo from "@/museum/collection/photos/fashion-chaos-2.jpg"
import leDejeunerSurLHerbe from "@/museum/collection/photos/le-dejeuner-sur-l-herbe.jpg"
import leMaraicher from "@/museum/collection/photos/le-maraicher.jpg"
import leMondeOnirique from "@/museum/collection/photos/le-monde-onirique.jpg"
import mensTokyo from "@/museum/collection/photos/mens-tokyo.jpg"
import requiem from "@/museum/collection/photos/requiem.jpg"

export type WorkPhoto = {
  src: string
  width: number
  height: number
}

export type CollectionWork = ArtworkLabel & {
  photo: WorkPhoto
}

const kind = "photograph"
const artist = "Dolla Shashin"
const medium = "Photographie"

const fashionChaos = {
  title: "Fashion Chaos",
  kind,
  artist,
  medium,
  statement: `Le chaos comme langage.
Le contraste comme manifeste.

Avec Fashion Chaos, Dakira Studio met face à face le désordre urbain et la féminité, la matière brute et une présence qui s'affirme. La série interroge l'esthétique du contraste, et fait du frottement visuel une signature.

C'est aussi leur première prise de parole : le lancement officiel de leur agence créative sur Instagram, et une direction annoncée d'emblée. Audace, textures, tension maîtrisée.

Une entrée en scène sans compromis.`,
  credits: [
    { role: "Studio créatif", names: "@dakira.studio" },
    { role: "Photographe", names: "@dollashashin" },
    { role: "Directrice artistique", names: "@solnzp" },
    { role: "Modèles", names: "@lucie_bttn_ & @awaessence" },
    { role: "MUA", names: "@juliegnzl" },
    { role: "Styliste", names: "@zoedressing & @Studio_Paillette" },
    { role: "Brand", names: "@ernestleoty" },
    { role: "Assistante backstage", names: "@fatimtiboo" },
    { role: "Assistante photographie", names: "Noa Edoko" },
    { role: "Chef prod.", names: "@aurdr" },
  ],
  link: "https://www.instagram.com/p/DVeTIadDZAX/",
} satisfies Omit<CollectionWork, "id" | "photo">

export const collectionWorks = [
  {
    ...fashionChaos,
    id: "fashion-chaos-1",
    title: "Fashion Chaos I",
    photo: { src: fashionChaosOne, width: 1600, height: 1320 },
  },
  {
    ...fashionChaos,
    id: "fashion-chaos-2",
    title: "Fashion Chaos II",
    photo: { src: fashionChaosTwo, width: 1481, height: 1600 },
  },
  {
    id: "le-monde-onirique",
    title: "Le monde onirique",
    kind,
    artist,
    medium,
    statement: `Une évasion. Ici, la réalité s'égare dans un paysage de fantaisie aux couleurs acidulées, et ne cherche pas le chemin du retour.

Un mirage poétique, où le merveilleux côtoie la culture pop d'aujourd'hui.`,
    credits: [
      {
        role: "Direction créative",
        names: "Solenne Zekhnini-Palenne @solnzp",
      },
      { role: "Photographe", names: "Dounia Limam @dollashashin" },
      { role: "Modèle", names: "Ivy @_ivyfleur" },
      { role: "MUA", names: "Julie Chassat @juliegnzl" },
    ],
    link: "https://www.instagram.com/p/DZxwOdpoAIC/",
    photo: { src: leMondeOnirique, width: 1143, height: 1600 },
  },
  {
    id: "a-swan-in-the-city",
    title: "a swan in the city",
    kind,
    artist,
    medium,
    statement: `On dit qu'il faut quitter le nid pour apprendre à voler.

Celle qui parle ici a grandi avec la créativité pour seconde nature : imaginer, créer, transformer, rêver plus grand que ce qui l'entourait. Mais dans une ville où tout semblait déjà écrit, ses ambitions ne tenaient plus entre quatre murs. Il fallait partir.

Paris s'est imposée comme une évidence. Une capitale où les rêves changent de dimension, où l'on se retrouve entouré de talents, de visages et d'univers, et où il faut trouver sa propre signature.

Quitter sa ville natale, c'est renoncer à un certain confort. Arriver là où personne ne connaît votre nom, où tout reste à construire, où chaque rencontre peut devenir une chance, et chaque échec une façon de se réinventer.

« Paris ne m'a pas appris à être créative. Je l'étais déjà. Elle m'a appris à l'assumer. »

À changer ses obsessions en projets, ses idées en images, ses rêves en quelque chose de tangible. À comprendre que ce qui paraît ridicule ailleurs peut devenir de l'art devant le bon public.

Comme un cygne noir, qui se révèle le jour où il cesse d'essayer d'être parfait pour commencer à être lui-même.

« Partir, finalement, ce n'était pas fuir qui j'étais. » C'était s'accorder l'espace nécessaire pour devenir pleinement celle qu'elle était censée être.`,
    credits: [
      {
        role: "Creative director & stylist",
        names: "Cassandra Harang @cassandraharang",
      },
      { role: "Stylist assistant", names: "Héloïse Antoine @heloisentn" },
      { role: "Photographer", names: "Dounia Limam @dollashashin" },
      { role: "Makeup artist", names: "Coraline Dupont @coraline.muafx" },
      { role: "Model", names: "Noémie @nomiduuh" },
      {
        role: "Assistante photographe",
        names: "Solène Zekhnini-Palenne @solnzp",
      },
      { role: "Assistante contenu", names: "Lana-Rose Lemaitre @lanalmtre" },
      { role: "Fashion", names: "@moodymumu_" },
    ],
    link: "https://www.instagram.com/p/DcBM54wjLMk/",
    photo: { src: aSwanInTheCity, width: 1066, height: 1600 },
  },
  {
    id: "abysses",
    title: "Abysses",
    kind,
    artist,
    medium,
    statement: `Une plongée. Abysses ouvre un monde surréaliste tenu par une palette froide : bleu givré, blanc nacré. Un modèle aux tresses infinies, paré de perles, au maquillage métallique : l'image explore la fluidité et l'étrangeté.

Madame y cultive sa signature visuelle : une atmosphère poétique, captivante, et délicatement dérangeante.`,
    credits: [
      { role: "Photographes", names: "@dollashashin et @samybienheureux" },
      { role: "Modèle", names: "@isaak__bensalem" },
      { role: "Styliste", names: "@emma_brl_" },
      { role: "Assistante styliste", names: "@malena.pe" },
      { role: "MUA", names: "@lisathellyere_" },
      { role: "Hair", names: "@cocoodle_" },
      {
        role: "Designers",
        names: "@dawnmartinsparis @morganelsr_ @houseofkaena",
      },
      { role: "Bijoux", names: "@emerys.creations" },
    ],
    photo: { src: abysses, width: 1262, height: 1600 },
  },
  {
    id: "mens-tokyo",
    title: "Mens, Tokyo",
    kind,
    artist,
    medium,
    statement: `Six figures dans un décor nocturne minimaliste. L'image interroge la multiplicité de l'identité humaine.

Le contraste du noir et du blanc dit notre dualité. Les poses théâtrales font apparaître la tension entre conformité et individualité, et l'aliénation moderne.

Restez un moment : la composition invite à une introspection profonde, sur l'essence de l'être.`,
    credits: [
      { role: "Modèle", names: "Leo Combaret Shimada" },
      { role: "Photographie & post-prod", names: "Dounia Limam" },
    ],
    link: "https://www.instagram.com/p/C-BBDEZtSc4/",
    photo: { src: mensTokyo, width: 1600, height: 953 },
  },
  {
    id: "celle-qui-vient-du-dedans",
    title: "celle qui vient du dedans",
    kind,
    artist,
    medium,
    statement: `Une présence silencieuse, presque insaisissable.

Entre rêve et mémoire, le corps devient langage, traversé par quelque chose de plus ancien, de plus enfoui.

La série explore une féminité intérieure, instinctive : une forme qui échappe aux contours, qui se ressent plus qu'elle ne se définit.

Un dialogue entre le visible et l'invisible, où chaque image semble surgir d'un espace intime, presque mythologique.`,
    credits: [
      { role: "Projet", names: "@dakira.studio" },
      {
        role: "Creative direction",
        names: "Solenne Zekhnini-Palenne @solnzp",
      },
      { role: "Photographer", names: "Dounia Limam @dollashashin" },
      { role: "Model", names: "Lucie Bouttin @lucie_bttn_" },
      { role: "MUA", names: "Julie Chassat @juliegnzl" },
    ],
    link: "https://www.instagram.com/p/DXv8ibtlda1/",
    photo: { src: celleQuiVientDuDedans, width: 1600, height: 898 },
  },
  {
    id: "requiem",
    title: "Requiem",
    kind,
    artist,
    medium,
    statement: `Requiem aeternam dona eis, Domine.
Donne-leur, Seigneur, le repos éternel.

Rien d'autre n'est écrit. Je ne dirai rien de plus.`,
    credits: [
      {
        role: "Creative direction",
        names: "Solenne Zekhnini-Palenne @solnzp",
      },
      { role: "Photographer", names: "Dounia Limam @dollashashin" },
      { role: "Model", names: "Lucie Bouttin @lucie_bttn_" },
      { role: "Stylisme", names: "@mign0n.ne" },
    ],
    link: "https://www.instagram.com/p/Detup0CCNtR/",
    photo: { src: requiem, width: 1089, height: 1600 },
  },
  {
    id: "brain",
    title: "Brain",
    kind,
    artist,
    medium,
    statement: `Une commande : un shooting pour l'artiste mAuVe, basé à Toulouse.

Direction artistique, maquillage, décor, stylisme, photographie : ici, tout est de la main de Madame.`,
    credits: [
      {
        role: "DA, MUA, set design, stylisme et photo",
        names: "Dounia Limam",
      },
    ],
    link: "https://www.instagram.com/p/DICCrYcNdHf/",
    photo: { src: brain, width: 1600, height: 898 },
  },
  {
    id: "le-maraicher",
    title: "Le maraîcher",
    kind,
    artist,
    medium,
    statement: `Dans le quartier, il y a des cagettes vertes, une ardoise qui change chaque semaine, et un store rayé qu'on reconnaîtrait les yeux fermés.

Les vendeurs vous saluent ; ils savent déjà ce que vous allez prendre.

Un maraîcher d'habitués, qui ne paie pas de mine, mais où l'on se sent vite chez soi. On y a le droit d'être soi-même, et même de briller entre les étals, grâce à leur chaleur.`,
    credits: [
      { role: "Modèle", names: "Sarah Emilien @urbansarahh" },
      { role: "MUA", names: "Julie Chassat @juliecmua" },
      { role: "Photographie", names: "Dounia Limam @dollashashin" },
      { role: "DA", names: "Solene Zekhnini-Palenne" },
      { role: "Studio", names: "Dakira Studio" },
    ],
    link: "https://www.instagram.com/p/DeSGl3BCIlq/",
    photo: { src: leMaraicher, width: 1066, height: 1600 },
  },
  {
    id: "le-dejeuner-sur-l-herbe",
    title: "le déjeuner sur l’herbe",
    kind,
    artist,
    medium,
    statement: `Vous connaissez la scène : le célèbre Déjeuner sur l'herbe. Cette photographie en casse la composition classique.

La scène est transposée avec un regard résolument moderne, en tons saturés et électriques, pour faire se heurter la tradition et la culture pop d'aujourd'hui.`,
    credits: [
      { role: "Photographe", names: "@dollashashin" },
      { role: "Directrice artistique", names: "@stellll.art / @stellsalutare" },
      {
        role: "Modèles",
        names: "@linchunting__ @i.keb @shimadakunn @stellsalutare",
      },
    ],
    photo: { src: leDejeunerSurLHerbe, width: 1600, height: 898 },
  },
  {
    id: "cannibal-flowers",
    title: "Cannibal flowers",
    kind,
    artist,
    medium,
    statement: `Une exploration de la voracité esthétique, entre mode pop et performance organique.

Dans un univers flashy et saturé, deux modèles incarnent des créatures florales en pleine dégustation de leur propre double : un gâteau-fleur aux allures de poison sucré.

C'est le récit d'une beauté qui, à force d'excès et de désir, finit par se consumer elle-même. Le projet joue sur la frontière entre l'attraction et la toxicité, entre l'identité et l'auto-cannibalisme.`,
    credits: [
      { role: "Studio", names: "Dakira Studio @dakira.studio" },
      { role: "Photographe", names: "Dounia Limam @dollashashin" },
      { role: "Directrice artistique", names: "Solene ZP @solnzp" },
      { role: "Assistante", names: "Fatimzahra Salil @fatimtiboo" },
      {
        role: "Set designer",
        names: "Dounia Limam et Stellina Salutare @stellsalutare",
      },
      { role: "Réal. vidéo", names: "Stellina Salutare @stellsalutare" },
      {
        role: "MUA",
        names: "Lucie Bouttin @lucie.bouttin et Elsa @elsa_mkpp",
      },
      {
        role: "Modèles",
        names: "Lin Chunting @linchunting__ et Becky Zaranko @beckyzaranko",
      },
      { role: "Styliste", names: "Astrid Adduard @astrid_adduard" },
      {
        role: "Marque",
        names: "@Manivanh.lengoc & Victoire Legouffe-Roux",
      },
      { role: "Bijoux", names: "Sandra Pitt @flowersbyssandra" },
      { role: "Cake design", names: "Luna @fleursdelait" },
    ],
    link: "https://www.instagram.com/p/DY7oPaGiEwp/",
    photo: { src: cannibalFlowers, width: 1600, height: 1105 },
  },
] as const satisfies readonly CollectionWork[]

export type CollectionWorkId = (typeof collectionWorks)[number]["id"]
