import guidanceImg from "../../assets/Guidance (1).png";
import journalImg from "../../assets/Journal.png";
import phqImg from "../../assets/Phq9.png";
import hotlineImg from "../../assets/Hotline.png";

import starImg from "../../assets/stars.png";
import arrowIcon from "../../assets/Icon.png";

function FeatureCard({
  variant = "gray",
  topLabel,
  line2,
  img,
  scale = 1.6,
}) {
  const isGreen = variant === "green";

  return (
    <div
      className={`
        w-full max-w-[620px]
        min-h-[180px]                 /* ✅ allows card to grow if text grows */
        rounded-[16px]
        border-2 border-black
        grid grid-cols-2
        overflow-hidden
        ${isGreen ? "bg-[#B9FF66]" : "bg-[#E9ECE7]"}
      `}
    >
      {/* LEFT SIDE — relative container so CTA can be pinned */}
      <div className="relative px-10 py-8">
        {/* TEXT AREA (takes space above the pinned CTA) */}
        <div className="pr-2 pb-14">
          {/* pb-14 reserves space so text never overlaps the CTA */}
          <span
            className={`
              inline-block w-fit
              px-3 py-[5px]
              rounded-[8px]
              font-extrabold
              text-[24px]
              ${isGreen ? "bg-[#E9ECE7]" : "bg-[#B9FF66]"}
            `}
          >
            {topLabel}
          </span>

          {line2 && (
            <div className="mt-2 font-extrabold text-[24px] text-[#222] leading-tight">
              {line2}
            </div>
          )}
        </div>

        {/* ✅ PINNED Learn more (never moves) */}
        <div className="absolute left-10 bottom-7">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
              <img
                src={arrowIcon}
                alt="arrow"
                className="w-[14px] h-[14px]"
                draggable={false}
              />
            </span>
            <span className="text-[15px] font-semibold">Learn more</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — IMAGE */}
      <div className="flex items-center justify-center overflow-visible">
        <img
          src={img}
          alt=""
          draggable={false}
          style={{ transform: scale(${scale}) }}
          className="
            h-[150px]
            w-auto
            object-contain
            select-none
            drop-shadow-[0_4px_0_rgba(0,0,0,0.18)]
          "
        />
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section className="w-full bg-white py-20">
      <div className="mx-auto w-full max-w-[1400px] px-6">
        {/* TITLE */}
        <div className="text-center mb-14">
          <h2 className="text-[34px] font-extrabold">Features</h2>
          <div className="mt-2 flex justify-center">
            <img src={starImg} alt="stars" className="h-[22px]" draggable={false} />
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12 place-items-center">
          <FeatureCard
            variant="gray"
            topLabel="Guidance"
            line2="Counseling"
            img={guidanceImg}
            scale={1.6}
          />

          <FeatureCard
            variant="green"
            topLabel="Journal"
            img={journalImg}
            scale={1.85}
          />

          <FeatureCard
            variant="gray"
            topLabel="Self-Check"
            line2="Assessment"
            img={phqImg}
            scale={1.75}
          />

          <FeatureCard
            variant="green"
            topLabel="Emergency"
            line2="Hotline"
            img={hotlineImg}
            scale={1.9}
          />
        </div>
      </div>
    </section>
  );
}
