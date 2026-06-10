// 呼び出し側からZod schema を渡すだけで「resolver: zodResolver(schema)」を差し込んだuseForm()を返す
// React hook formとZodのハイブリッドのようなもの
// 各ページで毎回以下のようにuseFormの引数を書く必要がなくなる
// ====
//   const {xxx, xxxxxx} = useForm({resolver: zodResolver(schema),defaultValues: ... });
// ====
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Resolver,
  useForm,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";
import { z } from "zod";

// フォーム値がオブジェクトのZodスキーマなら何でも許容
type AnyZodObject = z.ZodType<Record<string, any>, any, any>;

// 各画面が扱うzodスキーマ型(TSchema)を必須にしている
type UseAppZodFormParams<TSchema extends AnyZodObject> = {
  schema: TSchema;
} & UseFormProps<z.infer<TSchema>>; // UseFormProps<>はuseForm() に渡せるオプション一式、

// 呼び出し側から引数として渡されたschemaの値(型)がTSchemaに当てはめられ、UseAppZodFormParamsのTSchemaへ飛ばされる
export function useAppZodForm<TSchema extends AnyZodObject>(
  params: UseAppZodFormParams<TSchema>,
): UseFormReturn<z.infer<TSchema>> {
  // ...rest を残すことで共通フックとして各ページから異なる引数が追加で渡されても対応できる。※schemaはどのページからでも必須。
  const { schema, ...rest } = params;

  // zodResolver(schema)とだけして使用してもいいが、resolverをcastさせることでより強固なTypeScriptの型定義がされる。
  const resolver = zodResolver(schema) as Resolver<z.infer<TSchema>>;

  // useForm()が返す 「control/handleSubmit/reset」などを引数で渡したZodスキーマの型で返却する
  return useForm<z.infer<TSchema>>({
    resolver,
    ...rest,
  });
}

export type AppZodFormValues<TSchema extends AnyZodObject> = z.infer<TSchema>;
