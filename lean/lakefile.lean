import Lake
open Lake DSL

package «tcz» where
  leanOptions := #[
    ⟨`autoImplicit, false⟩
  ]

@[default_target]
lean_lib «TCZ» where
  srcDir := "."
