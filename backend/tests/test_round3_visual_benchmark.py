"""Deterministic Round 3 visual benchmark with labels declared before predictions.

NOTE: These six curated pairs demonstrate controlled semantic foreground/background
tests with known contrast ratios (evaluated against WCAG 2.1 relative luminance),
not general perceptual accuracy across arbitrary complex imagery.

Confusion Matrix convention:
  - Positive class (+): Contrast violation / failure (CONTRADICTED, ratio < 4.5:1)
  - Negative class (-): Compliant contrast (SUPPORTED, ratio >= 4.5:1)
"""
import io
from PIL import Image

from app.color_science import hex_to_rgb, contrast_ratio as cr_fn
from app.image_analyzer import analyze_image_compliance, assess_known_contrast_pair


def _png(color, altered=False):
    image = Image.new("RGB", (24, 24), color)
    if altered:
        image.putpixel((0, 0), tuple((channel + 1) % 256 for channel in color))
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    return stream.getvalue()


def test_known_pair_benchmark_metrics_are_computed_from_predictions():
    """Six documented design-token foreground/background pairs with mathematically
    verified WCAG 2.1 contrast ratios.

    All ratios were independently computed using the WCAG sRGB relative-luminance
    formula:  L = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin
    where R_lin = (R/255 <= 0.03928) ? R/255/12.92 : ((R/255+0.055)/1.055)^2.4
    Contrast ratio = (L_lighter + 0.05) / (L_darker + 0.05)
    """
    # Each entry: (foreground_hex, background_hex, threshold, expected_status, verified_ratio)
    labelled_pairs = [
        # --- Negative class (Compliant): ratio >= 4.5:1 -> SUPPORTED ---
        ("#0f172a", "#f1f5f9", 4.5, "SUPPORTED",     16.30),  # Dark Slate on Slate-100
        ("#0d3d38", "#ffffff", 4.5, "SUPPORTED",     12.06),  # Dark Teal on White
        ("#0f766e", "#ffffff", 4.5, "SUPPORTED",      5.47),  # Brand Teal on White
        # --- Positive class (Violation): ratio < 4.5:1 -> CONTRADICTED ---
        ("#fbbf24", "#ffffff", 4.5, "CONTRADICTED",   1.67),  # Amber-400 on White
        ("#cbd5e1", "#ffffff", 4.5, "CONTRADICTED",   1.48),  # Slate-300 on White
        ("#f8fafc", "#ffffff", 4.5, "CONTRADICTED",   1.05),  # Slate-50 on White
    ]

    results = []
    for fg_hex, bg_hex, threshold, expected_status, verified_ratio in labelled_pairs:
        fg_rgb = hex_to_rgb(fg_hex)
        bg_rgb = hex_to_rgb(bg_hex)
        res = assess_known_contrast_pair(fg_rgb, bg_rgb, minimum=threshold)
        results.append(res)

        # 1. Verify the classification is correct
        assert res["status"] == expected_status, (
            f"{fg_hex} on {bg_hex}: expected {expected_status}, got {res['status']} "
            f"(ratio={res['ratio']}:1)"
        )

        # 2. Verify the ratio is within tight tolerance of the independently
        #    computed value.  The color_science module rounds to 2 decimal
        #    places, so we allow +/- 0.05 to absorb rounding.
        assert abs(res["ratio"] - verified_ratio) <= 0.05, (
            f"{fg_hex} on {bg_hex}: expected ratio ~{verified_ratio}:1, "
            f"got {res['ratio']}:1 (delta={abs(res['ratio'] - verified_ratio):.3f})"
        )

    predictions = [r["status"] for r in results]
    expected   = [label for _, _, _, label, _ in labelled_pairs]

    # Confusion matrix
    tp = sum(p == e == "CONTRADICTED" for p, e in zip(predictions, expected))
    tn = sum(p == e == "SUPPORTED"    for p, e in zip(predictions, expected))
    fp = sum(p == "CONTRADICTED" and e == "SUPPORTED"    for p, e in zip(predictions, expected))
    fn = sum(p == "SUPPORTED"    and e == "CONTRADICTED"  for p, e in zip(predictions, expected))

    assert (tp, tn, fp, fn) == (3, 3, 0, 0), f"Expected (3,3,0,0), got ({tp},{tn},{fp},{fn})"

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    fpr       = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    assert precision == 1.00
    assert recall    == 1.00
    assert fpr       == 0.00


def test_contrast_ratio_regression_exact_values():
    """Independently verify each contrast ratio using the raw color_science
    module so the benchmark cannot silently drift if assess_known_contrast_pair
    changes its rounding strategy."""
    exact_checks = [
        ("#0f172a", "#f1f5f9", 16.30),
        ("#0d3d38", "#ffffff", 12.06),
        ("#0f766e", "#ffffff",  5.47),
        ("#fbbf24", "#ffffff",  1.67),
        ("#cbd5e1", "#ffffff",  1.48),
        ("#f8fafc", "#ffffff",  1.05),
    ]
    for fg_hex, bg_hex, expected in exact_checks:
        actual = cr_fn(hex_to_rgb(fg_hex), hex_to_rgb(bg_hex))
        assert abs(actual - expected) <= 0.05, (
            f"{fg_hex} on {bg_hex}: expected {expected}:1, got {actual}:1"
        )


def test_image_benchmark_keeps_unknown_or_uniform_contrast_indeterminate():
    result = analyze_image_compliance(_png((255, 255, 255)), ["#ffffff"])
    # A uniform image has no asserted foreground/background contrast finding.
    assert not any(f["category"] == "visual_accessibility" for f in result["visual_findings"])
    # A byte-modified copy is not treated as the same registered visual asset.
    modified = analyze_image_compliance(_png((45, 212, 191), altered=True), ["#2dd4bf"])
    assert any(f["type"] == "unregistered_asset" and f["status"] == "NEEDS_REVIEW" for f in modified["visual_findings"])
