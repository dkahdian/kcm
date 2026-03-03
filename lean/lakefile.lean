import Lake
open Lake DSL

package «kcmap» where
  leanOptions := #[
    ⟨`autoImplicit, false⟩
  ]

@[default_target]
lean_lib «KCMap» where
  srcDir := "."
