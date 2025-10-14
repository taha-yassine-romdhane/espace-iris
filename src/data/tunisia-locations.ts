/**
 * Tunisia Administrative Divisions Data
 * Contains all 24 governorates (regions) and their delegations
 * Following Next.js best practices for static data
 */

export interface Delegation {
  id: string;
  name: string;
  nameAr: string;
}

export interface Governorate {
  id: string;
  name: string;
  nameAr: string;
  delegations: Delegation[];
}

export const TUNISIA_GOVERNORATES: Governorate[] = [
  {
    id: "ariana",
    name: "Ariana",
    nameAr: "أريانة",
    delegations: [
      { id: "ariana_ville", name: "Ariana Ville", nameAr: "أريانة المدينة" },
      { id: "ettadhamen", name: "Ettadhamen", nameAr: "التضامن" },
      { id: "kalaat_landalous", name: "Kalâat el-Andalous", nameAr: "قلعة الأندلس" },
      { id: "raoued", name: "Raoued", nameAr: "الراوية" },
      { id: "sidi_thabet", name: "Sidi Thabet", nameAr: "سيدي ثابت" },
      { id: "soukra", name: "Soukra", nameAr: "السكرة" },
      { id: "mnihla", name: "Mnihla", nameAr: "المنيهلة" }
    ]
  },
  {
    id: "beja",
    name: "Béja",
    nameAr: "باجة",
    delegations: [
      { id: "beja_nord", name: "Béja Nord", nameAr: "باجة الشمالية" },
      { id: "beja_sud", name: "Béja Sud", nameAr: "باجة الجنوبية" },
      { id: "amdoun", name: "Amdoun", nameAr: "عمدون" },
      { id: "goubellat", name: "Goubellat", nameAr: "قبلاط" },
      { id: "mejez_el_bab", name: "Medjez el-Bab", nameAr: "مجاز الباب" },
      { id: "nefza", name: "Nefza", nameAr: "نفزة" },
      { id: "teboursouk", name: "Téboursouk", nameAr: "تبرسق" },
      { id: "testour", name: "Testour", nameAr: "تستور" },
      { id: "tibar", name: "Tibar", nameAr: "تيبار" }
    ]
  },
  {
    id: "ben_arous",
    name: "Ben Arous",
    nameAr: "بن عروس",
    delegations: [
      { id: "ben_arous", name: "Ben Arous", nameAr: "بن عروس" },
      { id: "bou_mhel_el_bassatine", name: "Bou Mhel el-Bassatine", nameAr: "بومهل البساتين" },
      { id: "el_mourouj", name: "El Mourouj", nameAr: "المروج" },
      { id: "ezzahra", name: "Ezzahra", nameAr: "الزهراء" },
      { id: "fouchana", name: "Fouchana", nameAr: "فوشانة" },
      { id: "hammam_chott", name: "Hammam Chott", nameAr: "حمام الشط" },
      { id: "hammam_lif", name: "Hammam-Lif", nameAr: "حمام الأنف" },
      { id: "megrine", name: "Mégrine", nameAr: "المقرين" },
      { id: "mohamedia", name: "Mohamedia", nameAr: "المحمدية" },
      { id: "mornag", name: "Mornag", nameAr: "المرناق" },
      { id: "radès", name: "Radès", nameAr: "رادس" },
      { id: "mornaguia", name: "Mornaguia", nameAr: "المرناقية" }
    ]
  },
  {
    id: "bizerte",
    name: "Bizerte",
    nameAr: "بنزرت",
    delegations: [
      { id: "bizerte_nord", name: "Bizerte Nord", nameAr: "بنزرت الشمالية" },
      { id: "bizerte_sud", name: "Bizerte Sud", nameAr: "بنزرت الجنوبية" },
      { id: "djedeida", name: "Djedeida", nameAr: "جديدة" },
      { id: "el_alia", name: "El Alia", nameAr: "العالية" },
      { id: "ghar_el_melh", name: "Ghar el-Melh", nameAr: "غار الملح" },
      { id: "mateur", name: "Mateur", nameAr: "ماطر" },
      { id: "menzel_bourguiba", name: "Menzel Bourguiba", nameAr: "منزل بورقيبة" },
      { id: "menzel_jemil", name: "Menzel Jemil", nameAr: "منزل جميل" },
      { id: "ras_jebel", name: "Ras Jebel", nameAr: "راس الجبل" },
      { id: "sejenane", name: "Sejenane", nameAr: "سجنان" },
      { id: "tinja", name: "Tinja", nameAr: "تينجة" },
      { id: "utique", name: "Utique", nameAr: "أوتيك" },
      { id: "zahra", name: "Zahra", nameAr: "الزهراء" },
      { id: "joumine", name: "Joumine", nameAr: "جومين" }
    ]
  },
  {
    id: "gabes",
    name: "Gabès",
    nameAr: "قابس",
    delegations: [
      { id: "gabes_ville", name: "Gabès Ville", nameAr: "قابس المدينة" },
      { id: "gabes_ouest", name: "Gabès Ouest", nameAr: "قابس الغربية" },
      { id: "gabes_sud", name: "Gabès Sud", nameAr: "قابس الجنوبية" },
      { id: "el_hamma", name: "El Hamma", nameAr: "الحامة" },
      { id: "mareth", name: "Mareth", nameAr: "مارث" },
      { id: "matmata", name: "Matmata", nameAr: "مطماطة" },
      { id: "menzel_habib", name: "Menzel el Habib", nameAr: "منزل الحبيب" },
      { id: "nouvelle_matmata", name: "Nouvelle Matmata", nameAr: "مطماطة الجديدة" },
      { id: "oudhref", name: "Oudhref", nameAr: "وذرف" },
      { id: "chenini_nahal", name: "Chenini Nahal", nameAr: "شنيني نحال" }
    ]
  },
  {
    id: "gafsa",
    name: "Gafsa",
    nameAr: "قفصة",
    delegations: [
      { id: "gafsa_nord", name: "Gafsa Nord", nameAr: "قفصة الشمالية" },
      { id: "gafsa_sud", name: "Gafsa Sud", nameAr: "قفصة الجنوبية" },
      { id: "belkhir", name: "Belkhir", nameAr: "بلخير" },
      { id: "el_guettar", name: "El Guettar", nameAr: "القطار" },
      { id: "el_ksar", name: "El Ksar", nameAr: "القصر" },
      { id: "mdhilla", name: "Mdhilla", nameAr: "المظيلة" },
      { id: "metlaoui", name: "Metlaoui", nameAr: "المتلوي" },
      { id: "moulares", name: "Moulares", nameAr: "المولارس" },
      { id: "redeyef", name: "Redeyef", nameAr: "الرديف" },
      { id: "sened", name: "Sened", nameAr: "سند" },
      { id: "sidi_aich", name: "Sidi Aïch", nameAr: "سيدي عيش" }
    ]
  },
  {
    id: "jendouba",
    name: "Jendouba",
    nameAr: "جندوبة",
    delegations: [
      { id: "jendouba", name: "Jendouba", nameAr: "جندوبة" },
      { id: "jendouba_nord", name: "Jendouba Nord", nameAr: "جندوبة الشمالية" },
      { id: "bousalem", name: "Bousalem", nameAr: "بوسالم" },
      { id: "fernana", name: "Fernana", nameAr: "فرنانة" },
      { id: "ghardimaou", name: "Ghardimaou", nameAr: "غار الدماء" },
      { id: "oued_meliz", name: "Oued Meliz", nameAr: "وادي مليز" },
      { id: "tabarka", name: "Tabarka", nameAr: "طبرقة" },
      { id: "ain_draham", name: "Aïn Draham", nameAr: "عين دراهم" },
      { id: "beni_mtir", name: "Beni Mtir", nameAr: "بني مطير" }
    ]
  },
  {
    id: "kairouan",
    name: "Kairouan",
    nameAr: "القيروان",
    delegations: [
      { id: "kairouan_nord", name: "Kairouan Nord", nameAr: "القيروان الشمالية" },
      { id: "kairouan_sud", name: "Kairouan Sud", nameAr: "القيروان الجنوبية" },
      { id: "alaâ", name: "Alaâ", nameAr: "العلا" },
      { id: "bou_hajla", name: "Bou Hajla", nameAr: "بوحجلة" },
      { id: "echrarda", name: "Echrarda", nameAr: "الشراردة" },
      { id: "haffouz", name: "Haffouz", nameAr: "حفوز" },
      { id: "hajeb_el_ayoun", name: "Hajeb el-Ayoun", nameAr: "حاجب العيون" },
      { id: "menzel_mehiri", name: "Menzel Mehiri", nameAr: "منزل مهيري" },
      { id: "nasrallah", name: "Nasrallah", nameAr: "نصر الله" },
      { id: "oueslatia", name: "Oueslatia", nameAr: "الوسلاتية" },
      { id: "sbikha", name: "Sbikha", nameAr: "السبيخة" }
    ]
  },
  {
    id: "kasserine",
    name: "Kasserine",
    nameAr: "القصرين",
    delegations: [
      { id: "kasserine_nord", name: "Kasserine Nord", nameAr: "القصرين الشمالية" },
      { id: "kasserine_sud", name: "Kasserine Sud", nameAr: "القصرين الجنوبية" },
      { id: "ezzouhour", name: "Ezzouhour", nameAr: "الزهور" },
      { id: "feriana", name: "Feriana", nameAr: "فريانة" },
      { id: "foussana", name: "Foussana", nameAr: "فوسانة" },
      { id: "haydra", name: "Haydra", nameAr: "حيدرة" },
      { id: "jedelienne", name: "Jedelienne", nameAr: "جدليان" },
      { id: "majel_bel_abbes", name: "Majel Bel Abbès", nameAr: "ماجل بلعباس" },
      { id: "sbeitla", name: "Sbeitla", nameAr: "سبيطلة" },
      { id: "sbiba", name: "Sbiba", nameAr: "سبيبة" },
      { id: "thala", name: "Thala", nameAr: "تالة" }
    ]
  },
  {
    id: "kebili",
    name: "Kébili",
    nameAr: "قبلي",
    delegations: [
      { id: "kebili_nord", name: "Kébili Nord", nameAr: "قبلي الشمالية" },
      { id: "kebili_sud", name: "Kébili Sud", nameAr: "قبلي الجنوبية" },
      { id: "douz_nord", name: "Douz Nord", nameAr: "دوز الشمالية" },
      { id: "douz_sud", name: "Douz Sud", nameAr: "دوز الجنوبية" },
      { id: "faouar", name: "Faouar", nameAr: "فوار" },
      { id: "souk_lahad", name: "Souk Lahad", nameAr: "سوق الأحد" }
    ]
  },
  {
    id: "kef",
    name: "Le Kef",
    nameAr: "الكاف",
    delegations: [
      { id: "kef_ouest", name: "Kef Ouest", nameAr: "الكاف الغربية" },
      { id: "kef_est", name: "Kef Est", nameAr: "الكاف الشرقية" },
      { id: "dahmani", name: "Dahmani", nameAr: "الدهماني" },
      { id: "jérissa", name: "Jérissa", nameAr: "جريصة" },
      { id: "kalaat_senan", name: "Kalâat es-Senam", nameAr: "قلعة السنان" },
      { id: "nebeur", name: "Nebeur", nameAr: "نبر" },
      { id: "sakiet_sidi_youssef", name: "Sakiet Sidi Youssef", nameAr: "ساقية سيدي يوسف" },
      { id: "sers", name: "Sers", nameAr: "سرس" },
      { id: "tajerouine", name: "Tajerouine", nameAr: "تاجروين" },
      { id: "touiref", name: "Touiref", nameAr: "الطويرف" },
      { id: "el_ksour", name: "El Ksour", nameAr: "القصور" }
    ]
  },
  {
    id: "mahdia",
    name: "Mahdia",
    nameAr: "المهدية",
    delegations: [
      { id: "mahdia", name: "Mahdia", nameAr: "المهدية" },
      { id: "bou_merdes", name: "Bou Merdes", nameAr: "بومرداس" },
      { id: "chebba", name: "Chebba", nameAr: "الشابة" },
      { id: "chorbane", name: "Chorbane", nameAr: "الشربان" },
      { id: "el_jem", name: "El Jem", nameAr: "الجم" },
      { id: "essouassi", name: "Essouassi", nameAr: "السواسي" },
      { id: "hebira", name: "Hebira", nameAr: "الهبيرة" },
      { id: "kerker", name: "Kerker", nameAr: "كركر" },
      { id: "ksibet_el_mediouni", name: "Ksibet el-Mediouni", nameAr: "قصيبة المديوني" },
      { id: "melloulèche", name: "Melloulèche", nameAr: "ملولش" },
      { id: "ouled_chamekh", name: "Ouled Chamekh", nameAr: "أولاد شامخ" },
      { id: "rejiche", name: "Rejiche", nameAr: "رجيش" },
      { id: "sidi_alouane", name: "Sidi Alouane", nameAr: "سيدي علوان" }
    ]
  },
  {
    id: "manouba",
    name: "Manouba",
    nameAr: "منوبة",
    delegations: [
      { id: "manouba", name: "Manouba", nameAr: "منوبة" },
      { id: "den_den", name: "Den Den", nameAr: "دندن" },
      { id: "djedeida", name: "Djedeida", nameAr: "جديدة" },
      { id: "el_battan", name: "El Battan", nameAr: "البطان" },
      { id: "borj_el_amri", name: "Borj El Amri", nameAr: "برج العامري" },
      { id: "oued_ellil", name: "Oued Ellil", nameAr: "وادي الليل" },
      { id: "tebourba", name: "Tebourba", nameAr: "تبربة" },
      { id: "mornaguia", name: "Mornaguia", nameAr: "المرناقية" }
    ]
  },
  {
    id: "medenine",
    name: "Médenine",
    nameAr: "مدنين",
    delegations: [
      { id: "medenine_nord", name: "Médenine Nord", nameAr: "مدنين الشمالية" },
      { id: "medenine_sud", name: "Médenine Sud", nameAr: "مدنين الجنوبية" },
      { id: "ben_gardane", name: "Ben Gardane", nameAr: "بن قردان" },
      { id: "beni_khedache", name: "Beni Khedache", nameAr: "بني خداش" },
      { id: "djerba_ajim", name: "Djerba Ajim", nameAr: "جربة أجيم" },
      { id: "djerba_houmt_souk", name: "Djerba Houmt Souk", nameAr: "جربة حومة السوق" },
      { id: "djerba_midoun", name: "Djerba Midoun", nameAr: "جربة ميدون" },
      { id: "sidi_makhlouf", name: "Sidi Makhlouf", nameAr: "سيدي مخلوف" },
      { id: "zarzis", name: "Zarzis", nameAr: "جرجيس" }
    ]
  },
  {
    id: "monastir",
    name: "Monastir",
    nameAr: "المنستير",
    delegations: [
      { id: "monastir", name: "Monastir", nameAr: "المنستير" },
      { id: "bekalta", name: "Bekalta", nameAr: "بقالطة" },
      { id: "bembla", name: "Bembla", nameAr: "بمبلة" },
      { id: "beni_hassen", name: "Beni Hassen", nameAr: "بني حسان" },
      { id: "ghenada", name: "Ghenada", nameAr: "قنادة" },
      { id: "jemmal", name: "Jemmal", nameAr: "جمال" },
      { id: "ksar_hellal", name: "Ksar Hellal", nameAr: "قصر هلال" },
      { id: "ksibet_el_mediouni", name: "Ksibet el-Mediouni", nameAr: "قصيبة المديوني" },
      { id: "moknine", name: "Moknine", nameAr: "المكنين" },
      { id: "ouerdanine", name: "Ouerdanine", nameAr: "الوردانين" },
      { id: "sahline", name: "Sahline", nameAr: "الساحلين" },
      { id: "sayada", name: "Sayada", nameAr: "الصيادة" },
      { id: "teboulba", name: "Teboulba", nameAr: "طبلبة" },
      { id: "zeramdine", name: "Zeramdine", nameAr: "زرمدين" }
    ]
  },
  {
    id: "nabeul",
    name: "Nabeul",
    nameAr: "نابل",
    delegations: [
      { id: "nabeul", name: "Nabeul", nameAr: "نابل" },
      { id: "beni_khalled", name: "Beni Khalled", nameAr: "بني خلاد" },
      { id: "beni_khiar", name: "Beni Khiar", nameAr: "بني خيار" },
      { id: "bouargoub", name: "Bouargoub", nameAr: "بوعرقوب" },
      { id: "dar_chaabane", name: "Dar Chaâbane", nameAr: "دار شعبان" },
      { id: "el_haouaria", name: "El Haouaria", nameAr: "الهوارية" },
      { id: "el_mida", name: "El Mida", nameAr: "الميدة" },
      { id: "grombalia", name: "Grombalia", nameAr: "قرمبالية" },
      { id: "hammamet", name: "Hammamet", nameAr: "الحمامات" },
      { id: "kelibia", name: "Kelibia", nameAr: "قليبية" },
      { id: "korba", name: "Korba", nameAr: "قربة" },
      { id: "menzel_bouzelfa", name: "Menzel Bouzelfa", nameAr: "منزل بوزلفة" },
      { id: "menzel_temime", name: "Menzel Temime", nameAr: "منزل تميم" },
      { id: "soliman", name: "Soliman", nameAr: "سليمان" },
      { id: "takelsa", name: "Takelsa", nameAr: "تاكلسة" },
      { id: "zaouiet_mgaiez", name: "Zaouiet Mgaiez", nameAr: "زاوية مقايز" }
    ]
  },
  {
    id: "sfax",
    name: "Sfax",
    nameAr: "صفاقس",
    delegations: [
      { id: "sfax_ville", name: "Sfax Ville", nameAr: "صفاقس المدينة" },
      { id: "sfax_ouest", name: "Sfax Ouest", nameAr: "صفاقس الغربية" },
      { id: "sfax_sud", name: "Sfax Sud", nameAr: "صفاقس الجنوبية" },
      { id: "agareb", name: "Agareb", nameAr: "عقارب" },
      { id: "bir_ali_ben_khalifa", name: "Bir Ali Ben Khalifa", nameAr: "بئر علي بن خليفة" },
      { id: "el_amra", name: "El Amra", nameAr: "العامرة" },
      { id: "el_hencha", name: "El Hencha", nameAr: "الهنشة" },
      { id: "ghraiba", name: "Ghraiba", nameAr: "الغريبة" },
      { id: "jebiniana", name: "Jebiniana", nameAr: "الجبينيانة" },
      { id: "kerkennah", name: "Kerkennah", nameAr: "قرقنة" },
      { id: "mahrès", name: "Mahrès", nameAr: "محرس" },
      { id: "menzel_chaker", name: "Menzel Chaker", nameAr: "منزل شاكر" },
      { id: "sakiet_eddaier", name: "Sakiet Eddaïer", nameAr: "ساقية الدائر" },
      { id: "sakiet_ezzit", name: "Sakiet Ezzit", nameAr: "ساقية الزيت" },
      { id: "skhira", name: "Skhira", nameAr: "الصخيرة" },
      { id: "thyna", name: "Thyna", nameAr: "طينة" }
    ]
  },
  {
    id: "sidi_bouzid",
    name: "Sidi Bouzid",
    nameAr: "سيدي بوزيد",
    delegations: [
      { id: "sidi_bouzid_ouest", name: "Sidi Bouzid Ouest", nameAr: "سيدي بوزيد الغربية" },
      { id: "sidi_bouzid_est", name: "Sidi Bouzid Est", nameAr: "سيدي بوزيد الشرقية" },
      { id: "bir_el_hafey", name: "Bir El Hafey", nameAr: "بئر الحفي" },
      { id: "cebbala_ouled_asker", name: "Cebbala Ouled Asker", nameAr: "صبالة أولاد عسكر" },
      { id: "jilma", name: "Jilma", nameAr: "جلمة" },
      { id: "mazzouna", name: "Mazzouna", nameAr: "مزونة" },
      { id: "meknassy", name: "Meknassy", nameAr: "المكناسي" },
      { id: "menzel_bouzaiane", name: "Menzel Bouzaiane", nameAr: "منزل بوزيان" },
      { id: "mezzouna", name: "Mezzouna", nameAr: "مزونة" },
      { id: "ouled_haffouz", name: "Ouled Haffouz", nameAr: "أولاد حفوز" },
      { id: "regueb", name: "Regueb", nameAr: "رقاب" },
      { id: "sidi_ali_ben_aoun", name: "Sidi Ali Ben Aoun", nameAr: "سيدي علي بن عون" },
      { id: "souk_jedid", name: "Souk Jedid", nameAr: "السوق الجديد" }
    ]
  },
  {
    id: "siliana",
    name: "Siliana",
    nameAr: "سليانة",
    delegations: [
      { id: "siliana_nord", name: "Siliana Nord", nameAr: "سليانة الشمالية" },
      { id: "siliana_sud", name: "Siliana Sud", nameAr: "سليانة الجنوبية" },
      { id: "bargou", name: "Bargou", nameAr: "برقو" },
      { id: "bou_arada", name: "Bou Arada", nameAr: "بوعرادة" },
      { id: "el_aroussa", name: "El Aroussa", nameAr: "العروسة" },
      { id: "el_krib", name: "El Krib", nameAr: "الكريب" },
      { id: "gaâfour", name: "Gaâfour", nameAr: "قعفور" },
      { id: "kesra", name: "Kesra", nameAr: "كسرى" },
      { id: "laribus", name: "Laribus", nameAr: "لاريبوس" },
      { id: "makthar", name: "Makthar", nameAr: "مكثر" },
      { id: "rouhia", name: "Rouhia", nameAr: "الروحية" },
      { id: "sidi_bou_rouis", name: "Sidi Bou Rouis", nameAr: "سيدي بورويس" }
    ]
  },
  {
    id: "sousse",
    name: "Sousse",
    nameAr: "سوسة",
    delegations: [
      { id: "sousse_ville", name: "Sousse Ville", nameAr: "سوسة المدينة" },
      { id: "sousse_riadh", name: "Sousse Riadh", nameAr: "سوسة الرياض" },
      { id: "sousse_jawhara", name: "Sousse Jawhara", nameAr: "سوسة الجوهرة" },
      { id: "sousse_sidi_abdelhamid", name: "Sousse Sidi Abdelhamid", nameAr: "سوسة سيدي عبد الحميد" },
      { id: "akouda", name: "Akouda", nameAr: "أكودة" },
      { id: "bouficha", name: "Bouficha", nameAr: "بوفيشة" },
      { id: "enfida", name: "Enfida", nameAr: "النفيضة" },
      { id: "hammam_sousse", name: "Hammam Sousse", nameAr: "حمام سوسة" },
      { id: "hergla", name: "Hergla", nameAr: "هرقلة" },
      { id: "kalaa_kebira", name: "Kalâa Kebira", nameAr: "قلعة الكبرى" },
      { id: "kalaa_seghira", name: "Kalâa Seghira", nameAr: "قلعة الصغرى" },
      { id: "kondar", name: "Kondar", nameAr: "قندار" },
      { id: "msaken", name: "M'saken", nameAr: "مساكن" },
      { id: "sidi_bou_ali", name: "Sidi Bou Ali", nameAr: "سيدي بوعلي" },
      { id: "sidi_el_hani", name: "Sidi El Hani", nameAr: "سيدي الهاني" },
      { id: "zaouiet_sousse", name: "Zaouiet Sousse", nameAr: "زاوية سوسة" }
    ]
  },
  {
    id: "tataouine",
    name: "Tataouine",
    nameAr: "تطاوين",
    delegations: [
      { id: "tataouine_nord", name: "Tataouine Nord", nameAr: "تطاوين الشمالية" },
      { id: "tataouine_sud", name: "Tataouine Sud", nameAr: "تطاوين الجنوبية" },
      { id: "bir_lahmar", name: "Bir Lahmar", nameAr: "بئر الأحمر" },
      { id: "dehiba", name: "Dehiba", nameAr: "الذهيبة" },
      { id: "ghomrassen", name: "Ghomrassen", nameAr: "غمراسن" },
      { id: "remada", name: "Remada", nameAr: "رمادة" },
      { id: "smâr", name: "Smâr", nameAr: "سمار" }
    ]
  },
  {
    id: "tozeur",
    name: "Tozeur",
    nameAr: "توزر",
    delegations: [
      { id: "tozeur", name: "Tozeur", nameAr: "توزر" },
      { id: "degache", name: "Degache", nameAr: "دقاش" },
      { id: "hazoua", name: "Hazoua", nameAr: "حازوة" },
      { id: "nefta", name: "Nefta", nameAr: "نفطة" },
      { id: "tameghza", name: "Tameghza", nameAr: "تمغزة" }
    ]
  },
  {
    id: "tunis",
    name: "Tunis",
    nameAr: "تونس",
    delegations: [
      { id: "tunis_belvédère", name: "Tunis-Belvédère", nameAr: "تونس البلفيدير" },
      { id: "tunis_cartago", name: "Tunis-Cartago", nameAr: "تونس قرطاج" },
      { id: "tunis_cité_el_khadra", name: "Tunis-Cité El Khadra", nameAr: "تونس مدينة الخضراء" },
      { id: "tunis_djebel_jelloud", name: "Tunis-Djebel Jelloud", nameAr: "تونس جبل الجلود" },
      { id: "tunis_el_kabaria", name: "Tunis-El Kabaria", nameAr: "تونس القبارية" },
      { id: "tunis_el_menzah", name: "Tunis-El Menzah", nameAr: "تونس المنزه" },
      { id: "tunis_el_omrane", name: "Tunis-El Omrane", nameAr: "تونس العمران" },
      { id: "tunis_el_omrane_superieur", name: "Tunis-El Omrane Supérieur", nameAr: "تونس العمران الأعلى" },
      { id: "tunis_el_ouardia", name: "Tunis-El Ouardia", nameAr: "تونس الوردية" },
      { id: "tunis_ettahrir", name: "Tunis-Ettahrir", nameAr: "تونس التحرير" },
      { id: "tunis_ezzouhour", name: "Tunis-Ezzouhour", nameAr: "تونس الزهور" },
      { id: "tunis_hraïria", name: "Tunis-Hraïria", nameAr: "تونس الهرايرية" },
      { id: "tunis_jebel_jelloud", name: "Tunis-Jebel Jelloud", nameAr: "تونس جبل الجلود" },
      { id: "tunis_la_goulette", name: "Tunis-La Goulette", nameAr: "تونس حلق الوادي" },
      { id: "tunis_la_marsa", name: "Tunis-La Marsa", nameAr: "تونس المرسى" },
      { id: "tunis_le_bardo", name: "Tunis-Le Bardo", nameAr: "تونس باردو" },
      { id: "tunis_medina", name: "Tunis-Medina", nameAr: "تونس المدينة" },
      { id: "tunis_séjoumi", name: "Tunis-Séjoumi", nameAr: "تونس سيجومي" },
      { id: "tunis_sidi_bou_said", name: "Tunis-Sidi Bou Said", nameAr: "تونس سيدي بوسعيد" },
      { id: "tunis_sidi_hassine", name: "Tunis-Sidi Hassine", nameAr: "تونس سيدي حسين" }
    ]
  },
  {
    id: "zaghouan",
    name: "Zaghouan",
    nameAr: "زغوان",
    delegations: [
      { id: "zaghouan", name: "Zaghouan", nameAr: "زغوان" },
      { id: "bir_mcherga", name: "Bir Mcherga", nameAr: "بئر مشارقة" },
      { id: "djebel_oust", name: "Djebel Oust", nameAr: "جبل الوسط" },
      { id: "el_fahs", name: "El Fahs", nameAr: "الفحص" },
      { id: "nadhour", name: "Nadhour", nameAr: "الناظور" },
      { id: "saouaf", name: "Saouaf", nameAr: "الصواف" }
    ]
  }
];

/**
 * Helper functions for working with Tunisia location data
 */

export const getGovernorateByName = (name: string): Governorate | undefined => {
  return TUNISIA_GOVERNORATES.find(gov => 
    gov.name.toLowerCase() === name.toLowerCase() || 
    gov.nameAr === name
  );
};

export const getGovernorateById = (id: string): Governorate | undefined => {
  return TUNISIA_GOVERNORATES.find(gov => gov.id === id);
};

export const getDelegationsByGovernorate = (governorateId: string): Delegation[] => {
  const governorate = getGovernorateById(governorateId);
  return governorate ? governorate.delegations : [];
};

export const getDelegationById = (governorateId: string, delegationId: string): Delegation | undefined => {
  const delegations = getDelegationsByGovernorate(governorateId);
  return delegations.find(del => del.id === delegationId);
};

export const getAllGovernorateNames = (): string[] => {
  return TUNISIA_GOVERNORATES.map(gov => gov.name);
};

export const getAllGovernorateIds = (): string[] => {
  return TUNISIA_GOVERNORATES.map(gov => gov.id);
};